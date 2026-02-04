# BenchX

**The standard for comparing LLM inference engines**

BenchX is a comprehensive benchmarking framework for comparing vLLM, SGLang, and TensorRT-LLM side-by-side. Run fair, reproducible benchmarks to find the best engine for your workload.

## Features

- 🚀 **Compare All Engines**: Benchmark vLLM, SGLang, and TensorRT-LLM together
- 📊 **Comprehensive Metrics**: Throughput, latency, TTFT, TPOT, memory usage
- ⚡ **All Quantization Methods**: AWQ, GPTQ, Marlin, FP8, BitsandBytes, GGUF, TorchAO
- 🎯 **Fair Comparisons**: Normalized workloads and consistent metrics
- 📈 **Detailed Reports**: JSON, CSV, and visual comparison reports
- 🔧 **Full Control**: Custom configs for each engine

## Installation

```bash
# Install with all engines
pip install benchx[engines]

# Or install individual engines
pip install benchx[vllm]
pip install benchx[sglang]
pip install benchx[tensorrt]
```

## Quick Start

### Basic Comparison

```python
from benchx import Benchmark

# Compare all three engines with default settings
benchmark = Benchmark(
    engines=["vllm", "sglang", "tensorrt"],
    model="meta-llama/Meta-Llama-3-8B-Instruct",
    prompts=["What is machine learning?", "Explain quantum computing:"],
    max_tokens=256
)

results = benchmark.run()
results.print_summary()
```

### Output Example

```
=== Benchmark Results ===

Model: meta-llama/Meta-Llama-3-8B-Instruct
Requests: 2 | Max Tokens: 256

Engine      Throughput    Avg Latency    TTFT       Memory
          (tokens/sec)        (sec)      (ms)        (GB)
----------------------------------------------------------------
vLLM           4,741         0.054       45.2       12.3
SGLang         3,221         0.079       38.5       11.8
TensorRT       5,120         0.050       42.1       10.9

Winner: TensorRT (highest throughput, lowest latency)
```

## Custom Engine Configurations

Pass custom configs for each engine:

```python
from benchx import Benchmark

benchmark = Benchmark(
    engines={
        "vllm": {
            "model": "Qwen/Qwen2.5-32B-Instruct-AWQ",
            "quantization": "awq",
            "tensor_parallel_size": 2,
            "gpu_memory_utilization": 0.8,
            "engine_kwargs": {
                "max_model_len": 4096,
                "enable_prefix_caching": True,
                "kv_cache_dtype": "fp8",
            }
        },
        "sglang": {
            "model": "meta-llama/Meta-Llama-3-8B-Instruct",
            "quantization": "fp8",
            "tensor_parallel_size": 2,
            "gpu_memory_utilization": 0.85,
            "engine_kwargs": {
                "attention_backend": "fa3",
                "max_running_requests": 128,
                "chunked_prefill_size": 8192,
            }
        },
        "tensorrt": {
            "model": "meta-llama/Meta-Llama-3-8B-Instruct",
            "quantization": "fp8",
            "tensor_parallel_size": 2,
            "engine_kwargs": {
                "max_batch_size": 128,
                "max_input_len": 2048,
            }
        }
    },
    prompts=["Write a story about AI:", "Explain neural networks:"],
    max_tokens=512
)

results = benchmark.run()
```

## Benchmark Scenarios

### 1. Throughput Test

```python
from benchx import Benchmark

# Generate many prompts for throughput testing
prompts = [f"Question {i}: What is AI?" for i in range(100)]

benchmark = Benchmark(
    engines=["vllm", "sglang", "tensorrt"],
    model="meta-llama/Meta-Llama-3-8B-Instruct",
    prompts=prompts,
    max_tokens=256,
    concurrent_requests=50  # Run 50 requests concurrently
)

results = benchmark.run()
results.plot_throughput()
```

### 2. Latency Test

```python
benchmark = Benchmark(
    engines=["vllm", "sglang", "tensorrt"],
    model="meta-llama/Meta-Llama-3-8B-Instruct",
    prompts=["Single request for latency test"],
    max_tokens=256,
    concurrent_requests=1  # Single request for lowest latency
)

results = benchmark.run()
results.plot_latency()
```

### 3. Multi-Turn Conversation

```python
# Simulate multi-turn conversation
conversation = [
    "Hello, who are you?",
    "What can you help me with?",
    "Tell me about machine learning",
    "Can you explain neural networks?",
    "What about deep learning?"
]

benchmark = Benchmark(
    engines=["vllm", "sglang", "tensorrt"],
    model="meta-llama/Meta-Llama-3-8B-Instruct",
    prompts=conversation,
    max_tokens=256,
    conversation_mode=True  # Enable conversation tracking
)

results = benchmark.run()
# SGLang typically wins here due to RadixAttention
```

### 4. Different Input Lengths

```python
# Test with varying input lengths
short_prompts = ["Hi"] * 20
medium_prompts = ["Explain machine learning in detail"] * 20
long_prompts = ["Here is a long context... " * 100] * 20

benchmark = Benchmark(
    engines=["vllm", "sglang", "tensorrt"],
    model="meta-llama/Meta-Llama-3-8B-Instruct",
    prompts=short_prompts + medium_prompts + long_prompts,
    max_tokens=256
)

results = benchmark.run()
results.plot_by_input_length()
```

## Quantization Comparison

Compare different quantization methods:

```python
from benchx import Benchmark

# Test FP16 baseline
benchmark_fp16 = Benchmark(
    engines={
        "vllm": {"model": "meta-llama/Meta-Llama-3-8B-Instruct", "dtype": "float16"},
        "sglang": {"model": "meta-llama/Meta-Llama-3-8B-Instruct", "dtype": "float16"},
        "tensorrt": {"model": "meta-llama/Meta-Llama-3-8B-Instruct", "dtype": "float16"},
    },
    prompts=["Test prompt"],
    max_tokens=256
)

# Test FP8 quantization
benchmark_fp8 = Benchmark(
    engines={
        "vllm": {"model": "meta-llama/Meta-Llama-3-8B-Instruct", "quantization": "fp8"},
        "sglang": {"model": "meta-llama/Meta-Llama-3-8B-Instruct", "quantization": "fp8"},
        "tensorrt": {"model": "meta-llama/Meta-Llama-3-8B-Instruct", "quantization": "fp8"},
    },
    prompts=["Test prompt"],
    max_tokens=256
)

# Test AWQ quantization
benchmark_awq = Benchmark(
    engines={
        "vllm": {"model": "Qwen/Qwen2.5-32B-Instruct-AWQ", "quantization": "awq"},
        "sglang": {"model": "Qwen/Qwen2.5-32B-Instruct-AWQ", "quantization": "awq"},
        "tensorrt": {"model": "Qwen/Qwen2.5-32B-Instruct-AWQ", "quantization": "awq"},
    },
    prompts=["Test prompt"],
    max_tokens=256
)

results_fp16 = benchmark_fp16.run()
results_fp8 = benchmark_fp8.run()
results_awq = benchmark_awq.run()

# Compare results
Benchmark.compare_results([results_fp16, results_fp8, results_awq])
```

## Sampling Parameters

Control generation parameters:

```python
benchmark = Benchmark(
    engines=["vllm", "sglang", "tensorrt"],
    model="meta-llama/Meta-Llama-3-8B-Instruct",
    prompts=["Write a creative story:"],
    max_tokens=512,
    sampling_params={
        "temperature": 0.8,
        "top_p": 0.95,
        "top_k": 50,
        "presence_penalty": 0.1,
        "frequency_penalty": 0.1,
        "repetition_penalty": 1.1,
    }
)

results = benchmark.run()
```

## Metrics Collected

- **Throughput**: Tokens/second, requests/second
- **Latency**: Average, P50, P95, P99
- **TTFT** (Time to First Token): First token latency
- **TPOT** (Time Per Output Token): Per-token generation speed
- **Memory**: GPU memory usage per engine
- **Tokens Generated**: Total tokens generated per engine

## Report Formats

```python
# Print summary to console
results.print_summary()

# Save JSON report
results.save_report("results.json", format="json")

# Save CSV report
results.save_report("results.csv", format="csv")

# Save Markdown report
results.save_report("results.md", format="markdown")

# Save HTML report with charts
results.save_report("results.html", format="html")

# Generate comparison plots
results.plot_throughput()
results.plot_latency()
results.plot_memory()
```

## Engine Comparison

| Feature | vLLM | SGLang | TensorRT-LLM |
|---------|------|--------|--------------|
| **Throughput** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Multi-turn Chat** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Latency** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Structured Outputs** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Ease of Use** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Quantization Support** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## Quantization Support

| Method | vLLM | SGLang | TensorRT | Pre-quantized Required |
|--------|------|--------|----------|------------------------|
| FP8 | ✅ | ✅ | ✅ | No |
| AWQ | ✅ | ✅ | ✅ | Yes |
| GPTQ | ✅ | ✅ | ✅ | Yes |
| Marlin | ✅ | ✅ | ❌ | Yes |
| BitsandBytes | ✅ | ✅ | ❌ | No |
| GGUF | ✅ | ✅ | ❌ | Yes |
| TorchAO | ✅ | ✅ | ❌ | No |
| INT4/INT8 | ❌ | ❌ | ✅ | No |

## When to Use Each Engine

### Use vLLM when:
- You need maximum throughput for batch inference
- You want the easiest setup and best documentation
- You're running high-traffic API endpoints

### Use SGLang when:
- You have multi-turn conversations with context reuse
- You need structured outputs (JSON, regex, EBNF)
- You're building RAG pipelines or agent workflows

### Use TensorRT-LLM when:
- You need the absolute lowest latency
- You're deploying on NVIDIA hardware in production
- You want the most optimized CUDA kernels

## Documentation

- [Usage Examples](USAGE_EXAMPLES.md) - Detailed examples for all scenarios
- [API Reference](docs/api.md) - Complete API documentation
- [Benchmarking Guide](docs/benchmarking.md) - Best practices

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

Apache 2.0 License - see [LICENSE](LICENSE) for details.

## Citation

```bibtex
@software{benchx2026,
  title = {BenchX: The Standard for Comparing LLM Inference Engines},
  author = {BenchX Team},
  year = {2026},
  url = {https://github.com/IMvision12/benchx}
}
```

## Acknowledgments

- [vLLM](https://github.com/vllm-project/vllm) - Fast and easy-to-use LLM inference
- [SGLang](https://github.com/sgl-project/sglang) - Structured generation language
- [TensorRT-LLM](https://github.com/NVIDIA/TensorRT-LLM) - NVIDIA's optimized inference
