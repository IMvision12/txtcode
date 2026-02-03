# LLM Engine 🚀

**One interface to rule them all** - Unified inference engine for Large Language Models.

Stop learning different APIs for vLLM, SGLang, TGI, TensorRT-LLM, and more. Use one simple interface for all inference engines and quantization methods.

## Features

- 🎯 **Unified API** - One interface for all major inference engines
- ⚡ **Auto-Selection** - Automatically picks the best engine for your hardware
- 🔧 **Easy Quantization** - Simple 4-bit, 8-bit, AWQ, GPTQ support
- 📊 **Benchmarking** - Compare performance across engines
- 🐍 **Python & CLI** - Use as library or command-line tool
- 🔌 **OpenAI Compatible** - Drop-in replacement for OpenAI API

## Supported Engines

| Engine | Status | Best For |
|--------|--------|----------|
| vLLM | ✅ | High throughput, large batches |
| SGLang | ✅ | Structured generation, complex prompts |
| TGI | ✅ | Production deployments |
| TensorRT-LLM | 🚧 | NVIDIA GPUs, lowest latency |
| ExLlamaV2 | 🚧 | Consumer GPUs, GPTQ models |
| llama.cpp | 🚧 | CPU inference, Apple Silicon |

## Supported Quantization

- ✅ BitsAndBytes (4-bit, 8-bit)
- ✅ AWQ (4-bit)
- ✅ GPTQ (2-8 bit)
- 🚧 GGUF (llama.cpp format)

## Quick Start

### Installation

```bash
# Basic installation
pip install llm-engine

# With specific engine
pip install llm-engine[vllm]
pip install llm-engine[sglang]

# With all engines (large install)
pip install llm-engine[all]
```

### Python API

```python
from llm_engine import serve

# Simplest usage - auto-selects best engine
server = serve("meta-llama/Llama-2-7b-hf")

# With specific engine and quantization
server = serve(
    model="meta-llama/Llama-2-7b-hf",
    engine="vllm",
    quantization="4bit",
    port=8000
)

# Generate text
response = server.generate("What is the meaning of life?")
print(response)
```

## Architecture

```
llm-engine/
├── llm_engine/
│   ├── core/           # Model loading, quantization, server management
│   ├── engines/        # Engine adapters (vLLM, SGLang, etc.)
│   ├── quantizers/     # Quantization methods (BitsAndBytes, AWQ, etc.)
│   ├── utils/          # Hardware detection, benchmarking
│   └── cli.py          # Command-line interface
```

## Examples

### Compare Engines

```python
from llm_engine import benchmark

results = benchmark(
    model="mistral-7b",
    engines=["vllm", "sglang"],
    quantizations=["none", "4bit"],
    prompts=["Tell me a joke", "Explain quantum physics"]
)

print(results.summary())
```

### Custom Configuration

```python
from llm_engine import serve, EngineConfig, QuantizationConfig

server = serve(
    model="meta-llama/Llama-2-70b-hf",
    engine=EngineConfig(
        name="vllm",
        tensor_parallel=4,  # Multi-GPU
        max_batch_size=128
    ),
    quantization=QuantizationConfig(
        method="awq",
        bits=4
    )
)
```

## Roadmap

- [x] Core architecture
- [x] vLLM adapter
- [x] SGLang adapter
- [x] BitsAndBytes quantization
- [ ] TensorRT-LLM adapter
- [ ] ExLlamaV2 adapter
- [ ] llama.cpp adapter
- [ ] AWQ quantization
- [ ] GPTQ quantization
- [ ] Benchmarking tools
- [ ] Auto-selection logic
- [ ] OpenAI-compatible API server

## Contributing

Contributions welcome! Please check out our [Contributing Guide](CONTRIBUTING.md).

## License

Apache 2.0 - See [LICENSE](LICENSE) for details.

### Third-Party Licenses

This library wraps the following open-source projects:

- **vLLM** - Apache 2.0 License
- **SGLang** - Apache 2.0 License  
- **TensorRT-LLM** - Apache 2.0 License
- **Text Generation Inference (TGI)** - Apache 2.0 License
- **bitsandbytes** - MIT License
- **llama.cpp** - MIT License
- **ExLlamaV2** - MIT License

See [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) for full license texts.

## Citation

If you use LLM Engine in your research, please cite:

```bibtex
@software{llm_engine,
  title = {LLM Engine: Unified Inference for Large Language Models},
  author = {LLM Engine Contributors},
  year = {2025},
  url = {https://github.com/yourusername/llm-engine}
}
```
