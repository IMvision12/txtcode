"""Base engine interface for inference frameworks."""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class EngineConfig:
    """Normalized configuration across engines."""
    
    model: str
    tensor_parallel_size: int = 1
    max_tokens: int = 2048
    gpu_memory_utilization: float = 0.9
    dtype: str = "auto"
    extra_params: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.extra_params is None:
            self.extra_params = {}


class BaseEngine(ABC):
    """Abstract base class for inference engines."""
    
    def __init__(self, config: EngineConfig):
        self.config = config
        self.engine = None
    
    @abstractmethod
    def initialize(self) -> None:
        """Initialize the engine with config."""
        pass
    
    @abstractmethod
    def generate(self, prompt: str, max_tokens: int = 256, **kwargs) -> Dict[str, Any]:
        """Generate response and return metrics."""
        pass
    
    @abstractmethod
    def batch_generate(self, prompts: List[str], max_tokens: int = 256, **kwargs) -> List[Dict[str, Any]]:
        """Batch generation with metrics."""
        pass
    
    @abstractmethod
    def get_memory_usage(self) -> Dict[str, float]:
        """Get current GPU memory usage."""
        pass
    
    @abstractmethod
    def shutdown(self) -> None:
        """Clean up resources."""
        pass
    
    def normalize_config(self, raw_config: Dict[str, Any]) -> EngineConfig:
        """Normalize engine-specific config to standard format."""
        return EngineConfig(
            model=raw_config.get("model"),
            tensor_parallel_size=raw_config.get("tp", raw_config.get("tensor_parallel_size", 1)),
            max_tokens=raw_config.get("max_tokens", 2048),
            gpu_memory_utilization=raw_config.get("gpu_memory_utilization", 0.9),
            dtype=raw_config.get("dtype", "auto"),
            extra_params=raw_config.get("extra_params", {})
        )
