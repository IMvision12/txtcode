"""Engine adapters for different inference frameworks."""

from benchx.engines.base import BaseEngine
from benchx.engines.vllm_engine import VLLMEngine
from benchx.engines.sglang_engine import SGLangEngine

ENGINE_REGISTRY = {
    "vllm": VLLMEngine,
    "sglang": SGLangEngine,
}

__all__ = ["BaseEngine", "ENGINE_REGISTRY"]
