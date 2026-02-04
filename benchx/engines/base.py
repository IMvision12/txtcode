"""Base engine interface for inference frameworks."""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field


@dataclass
class EngineConfig:
    """Normalized configuration across engines.
    
    This config passes through all engine-specific parameters via **kwargs,
    allowing users full control over quantization, parallelism, and optimization settings.
    """
    
    model: str
    tensor_parallel_size: int = 1
    pipeline_parallel_size: int = 1
    max_tokens: int = 2048
    gpu_memory_utilization: float = 0.9
    dtype: str = "auto"
    quantization: Optional[str] = None
    trust_remote_code: bool = False
    
    # All other engine-specific parameters
    engine_kwargs: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        if self.engine_kwargs is None:
            self.engine_kwargs = {}


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
