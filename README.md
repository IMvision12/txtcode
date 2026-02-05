# BenchX - LLM Inference Benchmarking

**Compare vLLM, SGLang, and TensorRT-LLM side-by-side using Docker**

BenchX is a CLI tool that uses Docker containers to benchmark LLM inference engines fairly and reproducibly, solving the dependency conflict problem.

## Why BenchX?

**Problem:** vLLM, SGLang, and TensorRT-LLM have conflicting dependencies and cannot be installed together.

**Solution:** BenchX runs each engine in its own Docker container, allowing fair comparisons without dependency conflicts.

**Result:** Reproducible benchmarks that work identically on any machine with Docker + GPU support.

## Features

- 🐳 **Docker-Based** - Each engine in isolated container
- 📊 **Fair Comparisons** - Same prompts, same metrics, same conditions
- 🔄 **Reproducible** - Identical results across all machines
- ⚡ **Easy Setup** - Just Docker + one command
- 🎯 **Comprehensive Metrics** - Throughput, latency, memory usage
- 🌍 **Cross-Platform** - Works on Windows, Linux, Mac

## Prerequisites

- **Docker** with GPU support ([NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html))
- **NVIDIA GPU** with CUDA support
- **8GB+ GPU memory** (for 8B models)

## Quick Start

### 1. Install Docker

**Linux:**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

**Windows/Mac:**
- Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
- Enable GPU support in settings

### 2. Install BenchX

```bash
pip install benchx
```

### 3. Build Docker Images

```bash
# Build all engine images (takes 10-15 minutes first time)
benchx build

# Or build specific engines
benchx build --engines vllm sglang
```

### 4. Run Benchmark

Create `benchmark.json`:
```json
{
  "engines": {
    "vllm": {
      "model": "meta-llama/Meta-Llama-3-8B-Instruct"
    },
    "sglang": {
      "model": "meta-llama/Meta-Llama-3-8B-Instruct"
    },
    "tensorrt": {
      "model": "meta-llama/Meta-Llama-3-8B-Instruct"
    }
  },
  "prompts": [
    "What is machine learning?",
    "Explain quantum computing.",
    "What are neural networks?"
  ],
  "max_tokens": 256
}
```

Run it:
```bash
benchx run --config benchmark.json
```

### Example Output

```
================================================================================
Benchmark Results
================================================================================

Engine       Throughput      Latency      Memory    
             (tokens/sec)    (sec)        (GB)      
--------------------------------------------------------------------------------
vllm         4741.23         0.054        12.34     
sglang       3221.45         0.079        11.82     
tensorrt     5120.67         0.050        10.91     
================================================================================

Results saved to: benchmark_results.json
```

## CLI Commands

### Build Images

```bash
# Build all engines
benchx build

# Build specific engines
benchx build --engines vllm sglang
```

### Manage Containers

```bash
# Start containers
benchx container start
benchx container start --engines vllm

# Stop containers
benchx container stop
benchx container stop --engines sglang

# Check status
benchx container status
```

### Run Benchmarks

```bash
benchx run --config benchmark.json
```

## Configuration

### Basic Config

```json
{
  "engines": {
    "vllm": {
      "model": "meta-llama/Meta-Llama-3-8B-Instruct"
    }
  },
  "prompts": ["What is AI?"],
  "max_tokens": 256
}
```

### Advanced Config

```json
{
  "engines": {
    "vllm": {
      "model": "Qwen/Qwen2.5-32B-Instruct-AWQ",
      "quantization": "awq",
      "tensor_parallel_size": 2,
      "gpu_memory_utilization": 0.8,
      "dtype": "auto",
      "trust_remote_code": false,
      "engine_kwargs": {
        "max_model_len": 4096,
        "enable_prefix_caching": true,
        "kv_cache_dtype": "fp8"
      }
    },
    "sglang": {
      "model": "meta-llama/Meta-Llama-3-8B-Instruct",
      "quantization": "fp8",
      "tensor_parallel_size": 2,
      "gpu_memory_utilization": 0.85,
      "engine_kwargs": {
        "attention_backend": "fa3",
        "max_running_requests": 128
      }
    },
    "tensorrt": {
      "model": "meta-llama/Meta-Llama-3-8B-Instruct",
      "quantization": "fp8",
      "tensor_parallel_size": 2,
      "engine_kwargs": {
        "max_batch_size": 128,
        "max_input_len": 2048
      }
    }
  },
  "prompts": [
    "Write a story about AI:",
    "Explain neural networks:"
  ],
  "max_tokens": 512,
  "temperature": 0.8,
  "top_p": 0.95,
  "output_file": "results.json"
}
```

### Config Options

**Engine Config:**
- `model` (required): Model name or path
- `tensor_parallel_size`: Number of GPUs (default: 1)
- `gpu_memory_utilization`: GPU memory fraction 0-1 (default: 0.9)
- `dtype`: Data type - "auto", "float16", "bfloat16" (default: "auto")
- `quantization`: Method - "awq", "gptq", "fp8", etc.
- `trust_remote_code`: Allow custom model code (default: false)
- `engine_kwargs`: Engine-specific parameters

**Benchmark Config:**
- `prompts` (required): List of prompts
- `max_tokens`: Max tokens to generate (default: 256)
- `temperature`: Sampling temperature (default: 1.0)
- `top_p`: Nucleus sampling (default: 1.0)
- `output_file`: Results file (default: "benchmark_results.json")

## Example Benchmarks

### Throughput Test

```json
{
  "engines": {
    "vllm": {"model": "meta-llama/Meta-Llama-3-8B-Instruct"},
    "sglang": {"model": "meta-llama/Meta-Llama-3-8B-Instruct"},
    "tensorrt": {"model": "meta-llama/Meta-Llama-3-8B-Instruct"}
  },
  "prompts": ["Question: What is AI?"] * 50,
  "max_tokens": 256
}
```

### Quantization Comparison

```json
{
  "engines": {
    "vllm_fp16": {
      "model": "meta-llama/Meta-Llama-3-8B-Instruct",
      "dtype": "float16"
    },
    "vllm_fp8": {
      "model": "meta-llama/Meta-Llama-3-8B-Instruct",
      "quantization": "fp8"
    },
    "vllm_awq": {
      "model": "Qwen/Qwen2.5-32B-Instruct-AWQ",
      "quantization": "awq"
    }
  },
  "prompts": ["Test prompt"],
  "max_tokens": 256
}
```

### Multi-GPU Setup

```json
{
  "engines": {
    "vllm": {
      "model": "meta-llama/Meta-Llama-3-70B-Instruct",
      "tensor_parallel_size": 4,
      "gpu_memory_utilization": 0.9
    }
  },
  "prompts": ["Test prompt"],
  "max_tokens": 256
}
```

## Architecture

```
BenchX CLI (User's machine)
    ↓ docker-compose
    ├─→ vLLM Container (:8000)
    │   └─ vLLM + FastAPI server
    ├─→ SGLang Container (:8001)
    │   └─ SGLang + FastAPI server
    └─→ TensorRT Container (:8002)
        └─ TensorRT + FastAPI server

All containers access GPU(s) via NVIDIA Container Toolkit
```

## Use Different GPUs per Engine

Edit `docker/docker-compose.yml`:

```yaml
services:
  vllm:
    environment:
      - CUDA_VISIBLE_DEVICES=0  # GPU 0
  
  sglang:
    environment:
      - CUDA_VISIBLE_DEVICES=1  # GPU 1
  
  tensorrt:
    environment:
      - CUDA_VISIBLE_DEVICES=2  # GPU 2
```

## Troubleshooting

### Docker not found

Install Docker and NVIDIA Container Toolkit (see Prerequisites).

### Container won't start

Check logs:
```bash
docker logs benchx-vllm
docker logs benchx-sglang
docker logs benchx-tensorrt
```

### Out of memory

Reduce `gpu_memory_utilization` in config:
```json
{
  "engines": {
    "vllm": {
      "model": "...",
      "gpu_memory_utilization": 0.7
    }
  }
}
```

### Port already in use

Change ports in `docker/docker-compose.yml`:
```yaml
services:
  vllm:
    ports:
      - "9000:8000"  # Changed from 8000
```

### Rebuild images after changes

```bash
benchx build --engines vllm
```

## When to Use Each Engine

### vLLM
- ✅ Maximum throughput for batch inference
- ✅ Easiest setup and best documentation
- ✅ High-traffic API endpoints
- ✅ Wide model support

### SGLang
- ✅ Multi-turn conversations with context reuse
- ✅ Structured outputs (JSON, regex, EBNF)
- ✅ RAG pipelines and agent workflows
- ✅ RadixAttention for prefix caching

### TensorRT-LLM
- ✅ Absolute lowest latency
- ✅ Production deployment on NVIDIA hardware
- ✅ Most optimized CUDA kernels
- ✅ Best for real-time applications

## Metrics Collected

- **Throughput**: Total tokens/second
- **Latency**: Average time per request
- **Memory**: GPU memory usage (GB)
- **Success Rate**: Successful vs failed requests
- **Per-request metrics**: Individual timings

## Development

### Build from source

```bash
git clone https://github.com/yourusername/benchx
cd benchx
pip install -e .
benchx build
```

### Modify server code

Edit `servers/*_server.py`, then rebuild:
```bash
benchx build --engines vllm
```

## Contributing

Contributions welcome! Please open an issue or PR.

## License

Apache 2.0 - see [LICENSE](LICENSE)

## Citation

```bibtex
@software{benchx2026,
  title = {BenchX: Docker-Based LLM Inference Benchmarking},
  author = {BenchX Team},
  year = {2026},
  url = {https://github.com/yourusername/benchx}
}
```

## Acknowledgments

- [vLLM](https://github.com/vllm-project/vllm)
- [SGLang](https://github.com/sgl-project/sglang)
- [TensorRT-LLM](https://github.com/NVIDIA/TensorRT-LLM)
- [NVIDIA Container Toolkit](https://github.com/NVIDIA/nvidia-docker)
