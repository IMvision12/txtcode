"""Benchmarking utilities for comparing engines and configurations."""

import time
import logging
from typing import List, Dict, Any
from dataclasses import dataclass
import statistics

logger = logging.getLogger(__name__)


@dataclass
class BenchmarkResult:
    """Results from a single benchmark run."""
    engine: str
    quantization: str
    prompt: str
    tokens_generated: int
    latency_ms: float
    tokens_per_second: float
    memory_used_gb: float
    success: bool
    error: str = ""


class BenchmarkResults:
    """Collection of benchmark results with analysis."""
    
    def __init__(self):
        self.results: List[BenchmarkResult] = []
    
    def add(self, result: BenchmarkResult):
        """Add a benchmark result."""
        self.results.append(result)
    
    def summary(self) -> str:
        """Generate a summary of results."""
        if not self.results:
            return "No results available"
        
        lines = ["\n" + "="*80]
        lines.append("BENCHMARK RESULTS SUMMARY")
        lines.append("="*80)
        
        # Group by engine and quantization
        configs = {}
        for result in self.results:
            key = f"{result.engine}_{result.quantization}"
            if key not in configs:
                configs[key] = []
            configs[key].append(result)
        
        # Print results for each configuration
        for config_name, config_results in configs.items():
            engine, quant = config_name.split('_')
            lines.append(f"\n{engine.upper()} with {quant} quantization:")
            lines.append("-" * 80)
            
            successful = [r for r in config_results if r.success]
            if not successful:
                lines.append("  ❌ All runs failed")
                continue
            
            avg_latency = statistics.mean(r.latency_ms for r in successful)
            avg_tps = statistics.mean(r.tokens_per_second for r in successful)
            avg_memory = statistics.mean(r.memory_used_gb for r in successful)
            
            lines.append(f"  ✅ Success rate: {len(successful)}/{len(config_results)}")
            lines.append(f"  ⚡ Avg latency: {avg_latency:.2f} ms")
            lines.append(f"  🚀 Avg throughput: {avg_tps:.2f} tokens/sec")
            lines.append(f"  💾 Avg memory: {avg_memory:.2f} GB")
        
        lines.append("\n" + "="*80)
        return "\n".join(lines)
    
    def to_dict(self) -> List[Dict[str, Any]]:
        """Convert results to list of dictionaries."""
        return [
            {
                "engine": r.engine,
                "quantization": r.quantization,
                "prompt": r.prompt,
                "tokens_generated": r.tokens_generated,
                "latency_ms": r.latency_ms,
                "tokens_per_second": r.tokens_per_second,
                "memory_used_gb": r.memory_used_gb,
                "success": r.success,
                "error": r.error,
            }
            for r in self.results
        ]
    
    def __str__(self) -> str:
        return self.summary()


def benchmark(
    model: str,
    engines: List[str],
    quantizations: List[str],
    prompts: List[str],
    max_tokens: int = 100,
) -> BenchmarkResults:
    """
    Benchmark different engine and quantization configurations.
    
    Args:
        model: Model ID to benchmark
        engines: List of engines to test
        quantizations: List of quantization methods to test
        prompts: List of test prompts
        max_tokens: Maximum tokens to generate per prompt
    
    Returns:
        BenchmarkResults object with all results
    
    Example:
        >>> results = benchmark(
        ...     model="meta-llama/Llama-2-7b-hf",
        ...     engines=["vllm", "sglang"],
        ...     quantizations=["none", "4bit"],
        ...     prompts=["Hello world", "Explain AI"]
        ... )
        >>> print(results.summary())
    """
    from llm_engine.core.model import load_model
    from llm_engine.utils.hardware import get_available_memory
    
    results = BenchmarkResults()
    
    logger.info(f"Starting benchmark for model: {model}")
    logger.info(f"Engines: {engines}")
    logger.info(f"Quantizations: {quantizations}")
    logger.info(f"Prompts: {len(prompts)}")
    
    total_runs = len(engines) * len(quantizations) * len(prompts)
    current_run = 0
    
    for engine in engines:
        for quantization in quantizations:
            logger.info(f"\n{'='*60}")
            logger.info(f"Testing: {engine} with {quantization}")
            logger.info(f"{'='*60}")
            
            try:
                # Load model
                logger.info("Loading model...")
                start_load = time.time()
                engine_instance = load_model(
                    model_id=model,
                    engine=engine,
                    quantization=quantization,
                )
                load_time = time.time() - start_load
                logger.info(f"Model loaded in {load_time:.2f}s")
                
                # Get memory usage
                memory_before = get_available_memory()
                
                # Run prompts
                for prompt in prompts:
                    current_run += 1
                    logger.info(f"[{current_run}/{total_runs}] Running prompt: {prompt[:50]}...")
                    
                    try:
                        start_time = time.time()
                        response = engine_instance.generate(
                            prompt=prompt,
                            max_tokens=max_tokens,
                        )
                        end_time = time.time()
                        
                        latency_ms = (end_time - start_time) * 1000
                        tokens_generated = len(response.split())  # Rough estimate
                        tokens_per_second = tokens_generated / (latency_ms / 1000) if latency_ms > 0 else 0
                        
                        memory_after = get_available_memory()
                        memory_used = memory_before["gpu_gb"] - memory_after["gpu_gb"]
                        if memory_used < 0:
                            memory_used = memory_before["ram_gb"] - memory_after["ram_gb"]
                        
                        result = BenchmarkResult(
                            engine=engine,
                            quantization=quantization,
                            prompt=prompt,
                            tokens_generated=tokens_generated,
                            latency_ms=latency_ms,
                            tokens_per_second=tokens_per_second,
                            memory_used_gb=max(0, memory_used),
                            success=True,
                        )
                        results.add(result)
                        
                        logger.info(f"  ✅ Success: {latency_ms:.2f}ms, {tokens_per_second:.2f} tok/s")
                        
                    except Exception as e:
                        logger.error(f"  ❌ Failed: {e}")
                        result = BenchmarkResult(
                            engine=engine,
                            quantization=quantization,
                            prompt=prompt,
                            tokens_generated=0,
                            latency_ms=0,
                            tokens_per_second=0,
                            memory_used_gb=0,
                            success=False,
                            error=str(e),
                        )
                        results.add(result)
                
                # Unload model
                engine_instance.unload_model()
                
            except Exception as e:
                logger.error(f"Failed to load {engine} with {quantization}: {e}")
                # Add failed results for all prompts
                for prompt in prompts:
                    current_run += 1
                    result = BenchmarkResult(
                        engine=engine,
                        quantization=quantization,
                        prompt=prompt,
                        tokens_generated=0,
                        latency_ms=0,
                        tokens_per_second=0,
                        memory_used_gb=0,
                        success=False,
                        error=str(e),
                    )
                    results.add(result)
    
    logger.info("\n" + "="*60)
    logger.info("Benchmark complete!")
    logger.info("="*60)
    
    return results
