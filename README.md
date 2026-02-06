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

## Large Model Support

BenchX supports very large models (70B, 405B+) through:

### Important: GPU Memory Sharing Issue

**The Problem:**
- In **local mode**, all engines share the same GPUs
- When vLLM loads a 1B model, it uses most GPU memory
- SGLang then fails with OOM when trying to load
- For 405B models, this is **much worse** - each engine needs 8+ GPUs

**The Solution:**

#### Local Mode: Sequential Benchmarking (Automatic)

BenchX automatically shuts down each engine after benchmarking to free GPU memory:

```bash
# This works - engines run one at a time
benchx run local --config 405b_model.json
```

**What happens:**
1. vLLM loads on GPUs 0-7, runs benchmark, shuts down
2. GPU memory is freed
3. SGLang loads on GPUs 0-7, runs benchmark, shuts down

**Limitation:** You can't benchmark engines in parallel in local mode.

#### Docker Mode: Parallel with GPU Partitioning

For parallel benchmarking of large models, use Docker with GPU partitioning:

**Step 1:** Use the 405B docker-compose file:
```bash
cd benchx/docker
cp docker-compose.405b.yml docker-compose.yml
```

**Step 2:** This allocates GPUs:
- vLLM: GPUs 0-7
- SGLang: GPUs 8-15

**Step 3:** Run benchmark:
```bash
benchx run docker --config examples/405b_model.json
```

**What happens:**
- Both engines load simultaneously on different GPU sets
- No memory conflicts
- True parallel benchmarking

### 1. Tensor Parallelism (Multi-GPU)

Split model across multiple GPUs:

```json
{
  "model": "meta-llama/Meta-Llama-3.1-405B-Instruct",
  "engines": {
    "vllm": {
      "tensor_parallel_size": 8,
      "gpu_memory_utilization": 0.95
    },
    "sglang": {
      "tensor_parallel_size": 8,
      "gpu_memory_utilization": 0.95
    }
  },
  "prompts": ["What is AI?"],
  "max_tokens": 512
}
```

**Notes:**
- `tensor_parallel_size` must divide evenly into available GPUs
- Each engine needs the same number of GPUs
- In Docker mode, use `--gpus all` or specify GPU IDs

### 2. Quantization

Reduce memory footprint with quantization:

**AWQ (4-bit):**
```json
{
  "engines": {
    "vllm": {
      "model": "hugging-quants/Meta-Llama-3.1-70B-Instruct-AWQ-INT4",
      "quantization": "awq",
      "tensor_parallel_size": 2
    }
  }
}
```

**FP8:**
```json
{
  "engines": {
    "vllm": {
      "model": "neuralmagic/Meta-Llama-3.1-70B-Instruct-FP8",
      "quantization": "fp8",
      "tensor_parallel_size": 2
    }
  }
}
```

**GPTQ (4-bit):**
```json
{
  "engines": {
    "vllm": {
      "model": "TheBloke/Llama-2-70B-GPTQ",
      "quantization": "gptq",
      "tensor_parallel_size": 2
    }
  }
}
```

### 3. Pipeline Parallelism (Coming Soon)

For extremely large models, pipeline parallelism splits layers across GPUs:

```json
{
  "engines": {
    "vllm": {
      "model": "meta-llama/Meta-Llama-3.1-405B-Instruct",
      "tensor_parallel_size": 4,
      "pipeline_parallel_size": 2,
      "gpu_memory_utilization": 0.95
    }
  }
}
```

### Memory Requirements

Approximate GPU memory needed (FP16/BF16):

| Model Size | No Quant | AWQ/GPTQ (4-bit) | FP8 | Recommended GPUs | Notes |
|------------|----------|------------------|-----|------------------|-------|
| 7B-8B | 16 GB | 6 GB | 8 GB | 1x A100/H100 | ✅ Works in local mode |
| 13B | 26 GB | 10 GB | 13 GB | 1x A100/H100 | ✅ Works in local mode |
| 30B-34B | 60 GB | 20 GB | 30 GB | 1x A100 80GB or 2x A100 40GB | ⚠️ Sequential only in local |
| 70B | 140 GB | 40 GB | 70 GB | 2x A100 80GB or 4x A100 40GB | ⚠️ Sequential only in local |
| 405B | 810 GB | 220 GB | 405 GB | 8x H100 or 16x A100 | ⚠️ Sequential only in local, Docker needs 16 GPUs for parallel |

**Key Points:**
- **Local mode**: Always sequential, engines share GPUs
- **Docker mode**: Can run parallel if you have 2x the GPUs (one set per engine)
- **Quantization**: Reduces memory by 2-4x, enabling larger models on fewer GPUs

### Example: 70B Model Comparison

**Local Mode (Sequential):**
```bash
# Benchmark vLLM first
benchx run local --config examples/large_model_70b.json
```

Config with one engine at a time:
```json
{
  "model": "meta-llama/Meta-Llama-3.1-70B-Instruct",
  "engines": {
    "vllm": {
      "tensor_parallel_size": 4,
      "dtype": "bfloat16",
      "gpu_memory_utilization": 0.9
    }
  },
  "prompts": ["Explain quantum computing"],
  "max_tokens": 512
}
```

**Docker Mode (Parallel with 8 GPUs):**

Edit `docker/docker-compose.yml`:
```yaml
services:
  vllm:
    environment:
      - CUDA_VISIBLE_DEVICES=0,1,2,3  # GPUs 0-3
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 4
              capabilities: [gpu]
  
  sglang:
    environment:
      - CUDA_VISIBLE_DEVICES=4,5,6,7  # GPUs 4-7
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 4
              capabilities: [gpu]
```

Config with both engines:
```json
{
  "model": "meta-llama/Meta-Llama-3.1-70B-Instruct",
  "engines": {
    "vllm": {
      "tensor_parallel_size": 4,
      "dtype": "bfloat16",
      "gpu_memory_utilization": 0.9
    },
    "sglang": {
      "tensor_parallel_size": 4,
      "dtype": "bfloat16",
      "gpu_memory_utilization": 0.9
    }
  },
  "prompts": ["Explain quantum computing"],
  "max_tokens": 512
}
```

Run:
```bash
benchx run docker --config examples/large_model_70b.json
```

### Example: 405B Model

**Requires 16 GPUs for parallel Docker benchmarking:**

```bash
# Use the 405B docker-compose configuration
cd benchx/docker
cp docker-compose.405b.yml docker-compose.yml

# Build and run
cd ..
benchx build docker
benchx run docker --config examples/405b_model.json
```

**Or use local mode (sequential, only 8 GPUs needed):**
```bash
benchx run local --config examples/405b_model.json
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
| **Multi-Engine** | Parallel execution | Sequential (one at a time) |
| **GPU Memory** | Isolated per container | Shared, may need tuning |

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

### Multi-GPU for Large Models

For models requiring multiple GPUs (70B, 405B), allocate GPUs to each engine:

```yaml
services:
  vllm:
    environment:
      - CUDA_VISIBLE_DEVICES=0,1,2,3  # GPUs 0-3 for vLLM
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 4
              capabilities: [gpu]
  
  sglang:
    environment:
      - CUDA_VISIBLE_DEVICES=4,5,6,7  # GPUs 4-7 for SGLang
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 4
              capabilities: [gpu]
```

Then in your config:
```json
{
  "model": "meta-llama/Meta-Llama-3.1-70B-Instruct",
  "engines": {
    "vllm": {
      "tensor_parallel_size": 4
    },
    "sglang": {
      "tensor_parallel_size": 4
    }
  }
}
```

## Troubleshooting

### Local Mode: Multiple engines running out of memory

When benchmarking multiple engines in local mode, they run sequentially but each loads the full model into GPU memory. If you see OOM errors:

**Solution 1: Lower memory usage per engine**
```json
{
  "model": "meta-llama/Llama-3.2-1B",
  "engines": {
    "vllm": {
      "gpu_memory_utilization": 0.4
    },
    "sglang": {
      "gpu_memory_utilization": 0.4
    }
  },
  "prompts": ["Test"],
  "max_tokens": 256
}
```

**Solution 2: Benchmark one engine at a time**
```json
{
  "model": "meta-llama/Llama-3.2-1B",
  "engines": {
    "vllm": {}
  },
  "prompts": ["Test"],
  "max_tokens": 256
}
```

Note: Docker mode doesn't have this issue as each container has isolated GPU access.

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

### Large Models: Out of Memory

**Symptoms:**
- "CUDA out of memory" errors
- Container/server crashes during initialization
- Model fails to load

**Solutions:**

1. **Use Quantization:**
```json
{
  "engines": {
    "vllm": {
      "model": "hugging-quants/Meta-Llama-3.1-70B-Instruct-AWQ-INT4",
      "quantization": "awq",
      "tensor_parallel_size": 2
    }
  }
}
```

2. **Increase Tensor Parallelism:**
```json
{
  "engines": {
    "vllm": {
      "model": "meta-llama/Meta-Llama-3.1-70B-Instruct",
      "tensor_parallel_size": 8,
      "gpu_memory_utilization": 0.95
    }
  }
}
```

3. **Lower Memory Utilization:**
```json
{
  "engines": {
    "vllm": {
      "model": "meta-llama/Meta-Llama-3.1-70B-Instruct",
      "tensor_parallel_size": 4,
      "gpu_memory_utilization": 0.85
    }
  }
}
```

4. **Check GPU Memory:**
```bash
nvidia-smi
```

Make sure you have enough total GPU memory for the model size (see Large Model Support section).

### Large Models: Slow Initialization

Large models (70B+) can take 2-5 minutes to initialize. This is normal. The benchmark will wait up to 5 minutes (300 seconds) for initialization.

If initialization times out:
- Increase timeout in config (not yet supported, coming soon)
- Check logs for actual errors
- Verify model is downloading correctly (first run downloads model)

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
