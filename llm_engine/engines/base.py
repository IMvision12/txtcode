from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from llm_engine.utils.config import EngineConfig, QuantizationConfig


class InferenceEngine(ABC):
    
    def __init__(
        self,
        model_path: str,
        engine_config: Optional[EngineConfig] = None,
        quantization_config: Optional[QuantizationConfig] = None,
    ):
        self.model_path = model_path
        self.engine_config = engine_config or EngineConfig()
        self.quantization_config = quantization_config or QuantizationConfig()
        self.model = None
        self.tokenizer = None
    
    @abstractmethod
    def load_model(self) -> None:
        pass
    
    @abstractmethod
    def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.7,
        top_p: float = 0.9,
        top_k: int = 50,
        **kwargs
    ) -> str:
        pass
    
    @abstractmethod
    def generate_batch(
        self,
        prompts: List[str],
        max_tokens: int = 512,
        temperature: float = 0.7,
        **kwargs
    ) -> List[str]:
        pass
    
    @abstractmethod
    def start_server(
        self,
        host: str = "0.0.0.0",
        port: int = 8000,
        **kwargs
    ) -> None:
        pass
    
    @abstractmethod
    def stop_server(self) -> None:
        pass
    
    @abstractmethod
    def get_supported_quantizations(self) -> List[str]:
        pass
    
    @abstractmethod
    def get_model_info(self) -> Dict[str, Any]:
        pass
    
    def unload_model(self) -> None:
        if self.model is not None:
            del self.model
            self.model = None
        if self.tokenizer is not None:
            del self.tokenizer
            self.tokenizer = None
    
    def __enter__(self):
        self.load_model()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.unload_model()
    
    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(model={self.model_path})"
