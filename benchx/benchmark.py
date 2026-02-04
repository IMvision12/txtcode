"""Core benchmarking orchestration."""

from typing import List, Optional, Dict, Any
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
import asyncio
from pathlib import Path

from benchx.engines import ENGINE_REGISTRY
from benchx.engines.base import EngineConfig
from benchx.workload import WorkloadConfig
from benchx.results import BenchmarkResults, RunResult
from benchx.metrics import MetricsCollector
from benchx.prompt_generator import PromptGenerator


@dataclass
class BenchmarkConfig:
    """Configuration for benchmark run."""
    
    engines: List[str]
    models: List[str]
    hardware: List[str]
    workloads: List[WorkloadConfig]
    metrics: List[str]
    output_dir: str = "results"
    fairness_check: bool = True
    warmup_requests: int = 5
    max_retries: int = 3


class InferenceBenchmark:
    """Main benchmark orchestrator."""
    
    def __init__(
        self,
        engines: List[str],
        models: List[str],
        hardware: List[str],
        workloads: List[WorkloadConfig],
        metrics: List[str],
        output_dir: str = "results",
        fairness_check: bool = True,
        warmup_requests: int = 5,
    ):
        self.config = BenchmarkConfig(
            engines=engines,
            models=models,
            hardware=hardware,
            workloads=workloads,
            metrics=metrics,
            output_dir=output_dir,
            fairness_check=fairness_check,
            warmup_requests=warmup_requests,
        )
        self.results = []
        
        # Create output directory
        Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    def run(self) -> BenchmarkResults:
        """Execute benchmark across all configurations."""
        print(f"\n{'='*80}")
        print(f"BenchX - LLM Inference Benchmark")
        print(f"{'='*80}")
        print(f"Engines: {', '.join(self.config.engines)}")
        print(f"Models: {', '.join(self.config.models)}")
        print(f"Workloads: {', '.join(w.name for w in self.config.workloads)}")
        print(f"{'='*80}\n")
        
        total_runs = len(self.config.engines) * len(self.config.models) * len(self.config.workloads)
        current_run = 0
        
        for engine_name in self.config.engines:
            for model in self.config.models:
                for workload in self.config.workloads:
                    current_run += 1
                    print(f"\n[{current_run}/{total_runs}] Running benchmark...")
                    
                    result = self._run_single_benchmark(engine_name, model, workload)
                    self.results.append(result)
                    
                    if result.success:
                        print(f"✓ Completed successfully")
                    else:
                        print(f"✗ Failed: {result.error}")
        
        print(f"\n{'='*80}")
        print(f"Benchmark completed: {len([r for r in self.results if r.success])}/{total_runs} successful")
        print(f"{'='*80}\n")
        
        return BenchmarkResults(self.results, self.config)
    
    def _run_single_benchmark(
        self,
        engine_name: str,
        model: str,
        workload: WorkloadConfig
    ) -> RunResult:
        """Run single engine+model+workload combination."""
        print(f"\nEngine: {engine_name}")
        print(f"Model: {model}")
        print(f"Workload: {workload.name}")
        print(f"{'-'*80}")
        
        # Initialize engine
        engine_class = ENGINE_REGISTRY.get(engine_name)
        if not engine_class:
            error_msg = f"Unknown engine: {engine_name}"
            print(f"✗ {error_msg}")
            return RunResult.failed(engine_name, model, workload.name, error_msg)
        
        engine_config = EngineConfig(model=model)
        engine = engine_class(engine_config)
        
        try:
            print(f"Initializing engine...")
            engine.initialize()
            print(f"✓ Engine initialized")
        except Exception as e:
            error_msg = f"Engine initialization failed: {str(e)}"
            print(f"✗ {error_msg}")
            return RunResult.failed(engine_name, model, workload.name, error_msg)
        
        # Warmup
        if self.config.warmup_requests > 0:
            print(f"\nWarming up ({self.config.warmup_requests} requests)...")
            self._run_warmup(engine, workload)
            print(f"✓ Warmup complete")
        
        # Run workload
        metrics_collector = MetricsCollector(self.config.metrics)
        
        print(f"\nRunning workload...")
        for i, concurrency in enumerate(workload.concurrency, 1):
            print(f"  [{i}/{len(workload.concurrency)}] Concurrency: {concurrency}")
            
            try:
                self._run_workload_iteration(
                    engine, workload, concurrency, metrics_collector
                )
                
                # Print interim results
                summary = metrics_collector.get_summary()
                print(f"      {summary}")
                
            except Exception as e:
                print(f"      ✗ Error: {str(e)}")
                metrics_collector.error_count += 1
        
        # Collect final metrics
        try:
            memory_usage = engine.get_memory_usage()
            engine.shutdown()
        except Exception as e:
            print(f"Warning: Error during cleanup: {e}")
            memory_usage = {}
        
        final_metrics = metrics_collector.aggregate()
        
        return RunResult(
            engine=engine_name,
            model=model,
            workload=workload.name,
            metrics=final_metrics,
            memory_usage=memory_usage,
            success=True,
        )
    
    def _run_warmup(self, engine, workload: WorkloadConfig) -> None:
        """Run warmup requests."""
        prompts = self._generate_prompts(workload, self.config.warmup_requests)
        
        for prompt in prompts:
            try:
                engine.generate(prompt, max_tokens=workload.params.get("output_tokens", 256))
            except Exception:
                pass  # Ignore warmup errors
    
    def _run_workload_iteration(
        self,
        engine,
        workload: WorkloadConfig,
        concurrency: int,
        metrics_collector: MetricsCollector,
    ) -> None:
        """Run single workload iteration with specified concurrency."""
        # Calculate number of requests based on duration
        estimated_requests = max(concurrency * 2, 10)  # At least 10 requests
        prompts = self._generate_prompts(workload, estimated_requests)
        
        max_tokens = workload.params.get("output_tokens", 256)
        temperature = workload.params.get("temperature", 0.7)
        
        start_time = time.perf_counter()
        requests_completed = 0
        
        if concurrency == 1:
            # Sequential execution
            for prompt in prompts:
                try:
                    result = engine.generate(
                        prompt,
                        max_tokens=max_tokens,
                        temperature=temperature
                    )
                    metrics_collector.record(result, concurrency)
                    requests_completed += 1
                except Exception as e:
                    metrics_collector.record({"error": str(e)}, concurrency)
        else:
            # Concurrent execution
            with ThreadPoolExecutor(max_workers=concurrency) as executor:
                futures = []
                for prompt in prompts[:concurrency * 3]:  # Limit total requests
                    future = executor.submit(
                        engine.generate,
                        prompt,
                        max_tokens,
                        temperature=temperature
                    )
                    futures.append(future)
                
                for future in as_completed(futures):
                    try:
                        result = future.result(timeout=60)
                        metrics_collector.record(result, concurrency)
                        requests_completed += 1
                    except Exception as e:
                        metrics_collector.record({"error": str(e)}, concurrency)
        
        elapsed = time.perf_counter() - start_time
        metrics_collector.record_iteration(concurrency, elapsed, requests_completed)
    
    def _generate_prompts(self, workload: WorkloadConfig, count: int) -> List[str]:
        """Generate prompts based on workload type."""
        workload_type = workload.workload_type
        params = workload.params
        
        if workload_type == "chat":
            context_lengths = params.get("context_lengths", [2048])
            context_length = context_lengths[0] if context_lengths else 2048
            return PromptGenerator.generate_chat_prompts(
                count=count,
                context_length=context_length,
                vary_length=True
            )
        
        elif workload_type == "rag":
            document_count = params.get("document_count", 1000)
            query_patterns = params.get("query_patterns", ["hot"])
            query_pattern = query_patterns[0] if query_patterns else "hot"
            context_length = params.get("context_length", 4096)
            
            return PromptGenerator.generate_rag_prompts(
                count=count,
                document_count=document_count,
                context_length=context_length,
                query_pattern=query_pattern
            )
        
        elif workload_type == "structured":
            schema = params.get("json_schema")
            return PromptGenerator.generate_structured_prompts(
                count=count,
                schema=schema
            )
        
        elif workload_type == "tool_calling":
            parallel_tools = params.get("parallel_tools", 5)
            return PromptGenerator.generate_tool_calling_prompts(
                count=count,
                parallel_tools=parallel_tools
            )
        
        elif workload_type == "coding":
            return PromptGenerator.generate_coding_prompts(count=count)
        
        else:
            # Fallback to simple prompts
            return [f"Test prompt {i}: Explain the concept of {i}" for i in range(count)]
