# BenchX

**The standard for comparing LLM inference engines**

BenchX is the neutral, automated benchmarking framework that lets infrastructure teams make data-driven decisions between vLLM, SGLang, TensorRT-LLM, and LMDeploy—backed by real workloads, not marketing slides.

## Why BenchX?

- **Fair Comparisons**: Automatically detects and normalizes config mismatches
- **Real Workloads**: Agent traces, coding sessions, RAG pipelines—not just synthetic data
- **Cost Modeling**: Shows $/1M tokens, not just tok/s
- **Regression Tracking**: Monitor performance across engine versions
- **Hardware Agnostic**: Test on H100, A100, A10, RTX4090, or cloud instances
- **Mock Engine**: Test without GPU for development and CI/CD

## Quick Start

```python
from benchx import InferenceBenchmark, Workload

# Define test matrix
benchmark = InferenceBenchmark(
    engines=["vllm", "sglang"],  # or ["mock"] for testing
    models=["meta-llama/Meta-Llama-3-8B"],
    hardware=["H100"],
    workloads=[
        Workload.chat(concurrency=[1, 10, 50], context_lengths=[2048, 8192]),
        Workload.rag(document_count=1000, query_patterns=["hot", "cold"]),
    ],
    metrics=["ttft", "tpot", "throughput", "gpu_memory", "p99_latency"]
)

# Run head-to-head comparison
results = benchmark.run()
results.generate_report(format="markdown")
results.recommend_engine(priority="cost")
```

## Installation

```bash
cd benchx
pip install -e .

# With engine support
pip install -e ".[engines]"
```

See [INSTALL.md](INSTALL.md) for detailed installation instructions.

## Features

- ✅ Multi-engine support (vLLM, SGLang, TensorRT-LLM, LMDeploy)
- ✅ Real-world workload patterns (Chat, RAG, Structured Generation, Tool Calling)
- ✅ Automatic config normalization and fairness checking
- ✅ Detailed metrics (TTFT, TPOT, throughput, latency percentiles)
- ✅ Cost analysis with cloud pricing
- ✅ Performance regression detection
- ✅ HTML/Markdown/JSON reports
- ✅ Mock engine for testing without GPU

## Workload Types

### Chat
Simulates conversational AI with varying context lengths and concurrency:
```python
Workload.chat(concurrency=[1, 10, 50], context_lengths=[2048, 8192])
```

### RAG (Retrieval-Augmented Generation)
Simulates document retrieval with hot/cold query patterns:
```python
Workload.rag(document_count=1000, query_patterns=["hot", "cold"])
```

### Structured Generation
Tests JSON schema compliance and structured outputs:
```python
Workload.structured_generation(json_schema="schema.json")
```

### Tool Calling
Simulates function calling and agent workflows:
```python
Workload.tool_calling(parallel_tools=5)
```

## Metrics

- **TTFT** (Time to First Token): Latency before first token
- **TPOT** (Time Per Output Token): Per-token generation speed
- **Throughput**: Tokens/second and requests/second
- **Latency Percentiles**: p50, p95, p99 latencies
- **GPU Memory**: Memory usage across GPUs
- **Cost**: $/1M tokens based on cloud pricing

## Testing Without GPU

Use the mock engine for development and CI/CD:

```python
benchmark = InferenceBenchmark(
    engines=["mock"],  # No GPU required!
    models=["meta-llama/Meta-Llama-3-8B"],
    hardware=["CPU"],
    workloads=[Workload.chat(concurrency=[1, 5, 10])],
    metrics=["ttft", "tpot", "throughput"]
)
```

See `examples/test_mock_engine.py` for a complete example.

## Examples

- `examples/test_mock_engine.py` - Test without GPU
- `examples/basic_benchmark.py` - Simple benchmark
- `examples/advanced_benchmark.py` - Comprehensive test matrix
- `examples/compare_engines.py` - Head-to-head comparison
- `examples/cost_analysis.py` - Cost modeling
- `examples/fairness_check.py` - Config validation

## Documentation

- [Getting Started](docs/GETTING_STARTED.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Contributing](CONTRIBUTING.md)
- [Installation](INSTALL.md)

## License

Apache 2.0
