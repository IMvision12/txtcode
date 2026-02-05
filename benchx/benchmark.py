"""Core benchmarking orchestration."""

from typing import List, Optional, Dict, Any, Union
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path

from benchx.engines.vllm_engine import VLLMEngine
from benchx.engines.sglang_engine import SGLangEngine
from benchx.engines.tensorrt_engine import TensorRTEngine
from benchx.engines.base import EngineConfig
from benchx.results import BenchmarkResults


# Engine registry
ENGINE_REGISTRY = {
    "vllm": VLLMEngine,
    "sglang": SGLangEngine,
    "tensorrt": TensorRTEngine,
}


class Benchmark:
    """Main benchmark class for comparing LLM inference engines.
    
    Example:
        # Simple comparison
        benchmark = Benchmark(
            engines=["vllm", "sglang", "tensorrt"],
            model="meta-llama/Meta-Llama-3-8B-Instruct",
            prompts=["What is AI?"],
            max_tokens=256
        )
        
        # Custom configs
        benchmark = Benchmark(
            engines={
                "vllm": {
                    "model": "Qwen/Qwen2.5-32B-Instruct-AWQ",
                    "quantization": "awq",
                    "tensor_parallel_size": 2,
                    "engine_kwargs": {"max_model_len": 4096}
                },
                "sglang": {...},
                "tensorrt": {...}
            },
            prompts=["Test prompt"],
            max_tokens=256
        )
    """
    
    def __init__(
        self,
        engines: Union[List[str], Dict[str, Dict[str, Any]]],
        model: Optional[str] = None,
        prompts: List[str] = None,
        max_tokens: int = 256,
        sampling_params: Optional[Dict[str, Any]] = None,
        concurrent_requests: int = 1,
        warmup_requests: int = 3,
        output_dir: str = "results",
    ):
        """Initialize benchmark.
        
        Args:
            engines: List of engine names or dict with custom configs per engine
            model: Model name (used if engines is a list)
            prompts: List of prompts to benchmark
            max_tokens: Maximum tokens to generate
            sampling_params: Sampling parameters (temperature, top_p, etc.)
            concurrent_requests: Number of concurrent requests
            warmup_requests: Number of warmup requests
            output_dir: Directory to save results
        """
        self.prompts = prompts or ["What is machine learning?"]
        self.max_tokens = max_tokens
        self.sampling_params = sampling_params or {}
        self.concurrent_requests = concurrent_requests
        self.warmup_requests = warmup_requests
        self.output_dir = output_dir
        
        # Parse engine configs
        self.engine_configs = self._parse_engine_configs(engines, model)
        
        # Create output directory
        Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    def _parse_engine_configs(
        self,
        engines: Union[List[str], Dict[str, Dict[str, Any]]],
        model: Optional[str]
    ) -> Dict[str, EngineConfig]:
        """Parse engine configurations."""
        configs = {}
        
        if isinstance(engines, list):
            # Simple list of engine names
            if not model:
                raise ValueError("model parameter required when engines is a list")
            
            for engine_name in engines:
                if engine_name not in ENGINE_REGISTRY:
                    raise ValueError(f"Unknown engine: {engine_name}")
                
                configs[engine_name] = EngineConfig(model=model)
        
        elif isinstance(engines, dict):
            # Custom configs per engine
            for engine_name, config_dict in engines.items():
                if engine_name not in ENGINE_REGISTRY:
                    raise ValueError(f"Unknown engine: {engine_name}")
                
                # Extract EngineConfig parameters
                configs[engine_name] = EngineConfig(
                    model=config_dict.get("model", ""),
                    tensor_parallel_size=config_dict.get("tensor_parallel_size", 1),
                    pipeline_parallel_size=config_dict.get("pipeline_parallel_size", 1),
                    gpu_memory_utilization=config_dict.get("gpu_memory_utilization", 0.9),
                    dtype=config_dict.get("dtype", "auto"),
                    quantization=config_dict.get("quantization"),
                    trust_remote_code=config_dict.get("trust_remote_code", False),
                    engine_kwargs=config_dict.get("engine_kwargs", {})
                )
        else:
            raise ValueError("engines must be a list or dict")
        
        return configs
    
    def run(self) -> BenchmarkResults:
        """Execute benchmark across all engines."""
        print(f"\n{'='*80}")
        print(f"BenchX - LLM Inference Benchmark")
        print(f"{'='*80}")
        print(f"Engines: {', '.join(self.engine_configs.keys())}")
        print(f"Prompts: {len(self.prompts)}")
        print(f"Max Tokens: {self.max_tokens}")
        print(f"Concurrent Requests: {self.concurrent_requests}")
        print(f"{'='*80}\n")
        
        results = {}
        
        for engine_name, config in self.engine_configs.items():
            print(f"\n{'='*80}")
            print(f"Testing: {engine_name}")
            print(f"Model: {config.model}")
            if config.quantization:
                print(f"Quantization: {config.quantization}")
            print(f"{'='*80}")
            
            result = self._run_engine(engine_name, config)
            results[engine_name] = result
        
        print(f"\n{'='*80}")
        print(f"Benchmark Completed")
        print(f"{'='*80}\n")
        
        return BenchmarkResults(results, self.prompts, self.max_tokens)
    
    def _run_engine(self, engine_name: str, config: EngineConfig) -> Dict[str, Any]:
        """Run benchmark for a single engine."""
        engine_class = ENGINE_REGISTRY.get(engine_name)
        if not engine_class:
            return {
                "success": False,
                "error": f"Unknown engine: {engine_name}",
                "total_time": 0,
            }
        
        engine = engine_class(config)
        
        try:
            # Initialize
            print(f"\n  Initializing engine...")
            engine.initialize()
            print(f"  ✓ Engine initialized")
            
            # Warmup
            if self.warmup_requests > 0:
                print(f"\n  Warming up ({self.warmup_requests} requests)...")
                for i in range(self.warmup_requests):
                    try:
                        engine.generate(
                            self.prompts[0],
                            max_tokens=self.max_tokens,
                            **self.sampling_params
                        )
                    except Exception as e:
                        print(f"  Warning: Warmup request {i+1} failed: {e}")
                print(f"  ✓ Warmup complete")
            
            # Run benchmark
            print(f"\n  Running benchmark...")
            start_time = time.perf_counter()
            
            all_results = []
            total_tokens = 0
            
            if self.concurrent_requests == 1:
                # Sequential execution
                for i, prompt in enumerate(self.prompts, 1):
                    print(f"    [{i}/{len(self.prompts)}] Processing...", end="\r")
                    try:
                        result = engine.generate(
                            prompt,
                            max_tokens=self.max_tokens,
                            **self.sampling_params
                        )
                        all_results.append(result)
                        total_tokens += result.get("tokens_generated", 0)
                    except Exception as e:
                        print(f"\n    ✗ Request {i} failed: {e}")
                        all_results.append({"error": str(e)})
            else:
                # Concurrent execution
                with ThreadPoolExecutor(max_workers=self.concurrent_requests) as executor:
                    futures = []
                    for prompt in self.prompts:
                        future = executor.submit(
                            engine.generate,
                            prompt,
                            self.max_tokens,
                            **self.sampling_params
                        )
                        futures.append(future)
                    
                    completed = 0
                    for future in as_completed(futures):
                        completed += 1
                        print(f"    [{completed}/{len(self.prompts)}] Processing...", end="\r")
                        try:
                            result = future.result(timeout=120)
                            all_results.append(result)
                            total_tokens += result.get("tokens_generated", 0)
                        except Exception as e:
                            print(f"\n    ✗ Request failed: {e}")
                            all_results.append({"error": str(e)})
            
            end_time = time.perf_counter()
            total_time = end_time - start_time
            
            print(f"\n  ✓ Benchmark complete")
            
            # Collect metrics
            successful_results = [r for r in all_results if "error" not in r]
            failed_count = len(all_results) - len(successful_results)
            
            if not successful_results:
                print(f"  ✗ All requests failed")
                return {
                    "success": False,
                    "error": "All requests failed",
                    "total_time": total_time,
                }
            
            # Calculate metrics
            latencies = [r.get("total_time", 0) for r in successful_results]
            ttfts = [r.get("ttft", 0) for r in successful_results if "ttft" in r]
            
            avg_latency = sum(latencies) / len(latencies) if latencies else 0
            avg_ttft = sum(ttfts) / len(ttfts) if ttfts else 0
            throughput = total_tokens / total_time if total_time > 0 else 0
            
            # Sort for percentiles
            latencies.sort()
            p50_latency = latencies[len(latencies) // 2] if latencies else 0
            p95_latency = latencies[int(len(latencies) * 0.95)] if latencies else 0
            p99_latency = latencies[int(len(latencies) * 0.99)] if latencies else 0
            
            # Get memory usage
            try:
                memory_usage = engine.get_memory_usage()
            except Exception as e:
                print(f"  Warning: Could not get memory usage: {e}")
                memory_usage = {}
            
            # Shutdown
            print(f"\n  Shutting down engine...")
            engine.shutdown()
            print(f"  ✓ Engine shutdown complete")
            
            metrics = {
                "success": True,
                "total_requests": len(self.prompts),
                "successful_requests": len(successful_results),
                "failed_requests": failed_count,
                "total_time": total_time,
                "total_tokens": total_tokens,
                "throughput_tokens_per_sec": throughput,
                "avg_latency": avg_latency,
                "p50_latency": p50_latency,
                "p95_latency": p95_latency,
                "p99_latency": p99_latency,
                "avg_ttft": avg_ttft,
                "memory_usage": memory_usage,
                "results": all_results,
            }
            
            # Print summary
            print(f"\n  Summary:")
            print(f"    Throughput: {throughput:.2f} tokens/sec")
            print(f"    Avg Latency: {avg_latency:.3f}s")
            print(f"    P95 Latency: {p95_latency:.3f}s")
            if avg_ttft > 0:
                print(f"    Avg TTFT: {avg_ttft*1000:.1f}ms")
            if memory_usage.get("total_allocated_gb"):
                print(f"    Memory: {memory_usage['total_allocated_gb']:.2f} GB")
            
            return metrics
            
        except Exception as e:
            print(f"\n  ✗ Engine failed: {e}")
            try:
                engine.shutdown()
            except:
                pass
            
            return {
                "success": False,
                "error": str(e),
                "total_time": 0,
            }
