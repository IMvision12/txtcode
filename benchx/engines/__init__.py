"""Engine adapters for different inference frameworks."""

from benchx.engines.base import BaseEngine
from benchx.engines.vllm_engine import VLLMEngine
from benchx.engines.sglang_engine import SGLangEngine
from benchx.engines.tensorrt_engine import TensorRTEngine

ENGINE_REGISTRY = {
    "vllm": VLLMEngine,
    "sglang": SGLangEngine,
    "tensorrt": TensorRTEngine,
}

__all__ = ["BaseEngine", "ENGINE_REGISTRY"]
