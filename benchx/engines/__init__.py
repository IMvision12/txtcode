"""Engine adapters for different inference frameworks."""

from benchx.engines.base import BaseEngine
from benchx.engines.vllm_engine import VLLMEngine
from benchx.engines.sglang_engine import SGLangEngine
from benchx.engines.tensorrt_engine import TensorRTEngine
from benchx.engines.mock_engine import MockEngine

ENGINE_REGISTRY = {
    "vllm": VLLMEngine,
    "sglang": SGLangEngine,
    "tensorrt": TensorRTEngine,
    "mock": MockEngine,  # For testing without GPU
}

__all__ = ["BaseEngine", "ENGINE_REGISTRY"]
