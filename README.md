# BenchX - LLM Inference Benchmarking

**Compare vLLM, SGLang, and TensorRT-LLM side-by-side**

BenchX supports two modes:
- **Docker Mode** (Recommended) - Production-ready, reproducible, works everywhere
- **Local Mode** - For Google Colab, quick testing, or when Docker isn't available

## Why BenchX?

**Problem:** vLLM, SGLang, and TensorRT-LLM have conflicting dependencies and cannot be installed together.

**Solution:** BenchX isolates each engine (via Docker containers or separate venvs) for fair comparisons.

**Result:** Reproducible benchmarks with comprehensive metrics.

## Features

- 🐳 **Docker Mode** - Production-ready with full isolation
- 🐍 **Local Mode** - Works on Google Colab and systems without Docker
- 📊 **Fair Comparisons** - Same prompts, same metrics, same conditions
- 🔄 **Reproducible** - Consistent results across environments
- ⚡ **Easy Setup** - One command to get started
- 🎯 **Comprehensive Metrics** - Throughput, latency, memory usage
- 🌍 **Cross-Platform** - Works on Windows, Linux, Mac

## Quick Start

### Choose Your Mode

**Docker Mode** (Recommended for production/local machines):
- ✅ Complete isolation
- ✅ 100% reproducible
- ✅ Production-ready
- ❌ Requires Docker + NVIDIA Container Toolkit

**Local Mode** (For Colab/testing):
- ✅ Works on Google Colab
- ✅ No Docker required
- ✅ Faster iteration
- ❌ Less isolated (but still works!)

---

## Docker Mode (Recommended)

### Prerequisites

- **Docker** with GPU support ([NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html))
- **NVIDIA GPU** with CUDA support
- **8GB+ GPU memory** (for 8B models)

### Setup

**1. Install Docker**

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

**2. Install BenchX**

```bash
pip install benchx
```

**3. Build Docker Images**

```bash
# Build all engine images (takes 10-15 minutes first time)
benchx build docker

# Or build specific engines
benchx build docker --engines vllm sglang
```

**4. Run Benchmark**

Create `benchmark.json`:
```json
{
  "model": "meta-llama/Meta-Llama-3-8B-Instruct",
  "engines": {
    "vllm": {},
    "sglang": {},
    "tensorrt": {}
  },
  "prompts": ["What is AI?", "Explain ML"],
  "max_tokens": 256
}
```

Run it:
```bash
benchx run docker --config benchmark.json
```

---

## Local Mode (For Colab/Testing)

### Setup

**1. Install BenchX**

```bash
pip install benchx
```

**2. Setup Environments**

```bash
# Setup all engines (creates separate venvs)
benchx build local

# Or setup specific engines
benchx build local --engines vllm sglang
```

**3. Run Benchmark**

```bash
benchx run local --config benchmark.json
```

### Google Colab Usage

```python
# In Colab notebook

# Install BenchX
!pip install benchx

# Setup environments (takes 5-10 minutes)
!benchx build local

# Create config
config = {
    "model": "meta-llama/Meta-Llama-3-8B-Instruct",
    "engines": {
        "vllm": {},
        "sglang": {}
    },
    "prompts": ["What is AI?"],
    "max_tokens": 256
}

import json
with open("benchmark.json", "w") as f:
    json.dump(config, f)

# Run benchmark
!benchx run local --config benchmark.json
```

---

## Example Output

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

### Docker Mode

```bash
# Build images
benchx build docker
benchx build docker --engines vllm

# Manage containers
benchx container start
benchx container stop
benchx container status

# Run benchmark
benchx run docker --config benchmark.json
```

### Local Mode

```bash
# Setup environments
benchx build local
benchx build local --engines vllm sglang

# Start servers
benchx server start vllm local
benchx server start sglang local --foreground

# View server logs (troubleshooting)
benchx server logs vllm
benchx server logs sglang --lines 100

# Run benchmark
benchx run local --config benchmark.json
```

### Universal Commands

```bash
# Check status (works for both modes)
benchx server status

# Run benchmark (specify mode)
benchx run docker --config benchmark.json  # Docker mode
benchx run local --config benchmark.json   # Local mode
```

## Configuration

### Basic Config

```json
{
  "model": "meta-llama/Meta-Llama-3-8B-Instruct",
  "engines": {
    "vllm": {},
    "sglang": {},
    "tensorrt": {}
  },
  "prompts": ["What is AI?"],
  "max_tokens": 256
}
```

### Advanced Config (Per-Engine Customization)

```json
{
  "model": "meta-llama/Meta-Llama-3-8B-Instruct",
  "engines": {
    "vllm": {
      "quantization": "awq",
      "tensor_parallel_size": 2,
      "gpu_memory_utilization": 0.8,
      "engine_kwargs": {
        "max_model_len": 4096,
        "enable_prefix_caching": true
      }
    },
    "sglang": {
      "quantization": "fp8",
      "tensor_parallel_size": 2,
      "engine_kwargs": {
        "attention_backend": "fa3"
      }
    },
    "tensorrt": {
      "quantization": "fp8",
      "tensor_parallel_size": 2
    }
  },
  "prompts": ["Write a story:", "Explain AI:"],
  "max_tokens": 512,
  "temperature": 0.8
}
```

### Different Models Per Engine

```json
{
  "engines": {
    "vllm": {
      "model": "meta-llama/Meta-Llama-3-8B-Instruct"
    },
    "sglang": {
      "model": "Qwen/Qwen2.5-32B-Instruct-AWQ",
      "quantization": "awq"
    }
  },
  "prompts": ["What is AI?"],
  "max_tokens": 256
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

### Docker Mode
```
BenchX CLI
    ↓ docker-compose
    ├─→ vLLM Container (:8000)
    ├─→ SGLang Container (:8001)
    └─→ TensorRT Container (:8002)
```

### Local Mode
```
BenchX CLI
    ↓ subprocess
    ├─→ vLLM Server (envs/venv_vllm :8000)
    ├─→ SGLang Server (envs/venv_sglang :8001)
    └─→ TensorRT Server (envs/venv_tensorrt :8002)
```

## Mode Comparison

| Feature | Docker Mode | Local Mode |
|---------|-------------|------------|
| **Isolation** | Complete (OS-level) | Python venv only |
| **Reproducibility** | 100% | ~95% |
| **Setup Time** | 10-15 min (first time) | 5-10 min |
| **Disk Space** | ~20 GB | ~15 GB |
| **Google Colab** | ❌ Not supported | ✅ Works |
| **Production Ready** | ✅ Yes | ⚠️ Testing only |
| **Cross-Platform** | ✅ Identical everywhere | ⚠️ Platform differences |
| **Debugging** | `docker logs` | Direct Python logs |

**Recommendation:**
- **Production/Local Dev:** Use Docker mode
- **Google Colab/Quick Testing:** Use Local mode

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

### Local Mode: Servers not responding

Check server logs:
```bash
benchx server logs vllm
benchx server logs sglang
```

Common issues:
- **Missing dependencies**: Check logs for import errors
- **CUDA not available**: Ensure GPU drivers are installed
- **Port conflicts**: Another process using ports 8000-8002
- **Slow startup**: Servers can take 30-60s to import heavy libraries

Manual health check:
```bash
curl http://localhost:8000/health
curl http://localhost:8001/health
```

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
