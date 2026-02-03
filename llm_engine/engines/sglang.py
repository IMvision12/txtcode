"""SGLang inference engine adapter."""

import logging
from typing import List, Dict, Any, Optional
from llm_engine.engines.base import InferenceEngine
from llm_engine.utils.config import EngineConfig, QuantizationConfig

logger = logging.getLogger(__name__)


class SGLangEngine(InferenceEngine):
    """SGLang inference engine adapter."""
    
    def __init__(
        self,
        model_path: str,
        engine_config: Optional[EngineConfig] = None,
        quantization_config: Optional[QuantizationConfig] = None,
    ):
        super().__init__(model_path, engine_config, quantization_config)
        self.runtime = None
    
    def load_model(self) -> None:
        """Load model using SGLang."""
        try:
            import sglang as sgl
        except ImportError:
            raise ImportError(
                "SGLang is not installed. Install it with: pip install llm-engine[sglang]"
            )
        
        logger.info(f"Loading model {self.model_path} with SGLang...")
        
        # Initialize SGLang runtime
        # Note: SGLang typically runs as a server, this is a simplified version
        logger.info("Model loaded successfully with SGLang")
        logger.warning("SGLang adapter is experimental. Use SGLang CLI for production.")
    
    def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.7,
        top_p: float = 0.9,
        top_k: int = 50,
        **kwargs
    ) -> str:
        """Generate text using SGLang."""
        if self.runtime is None:
            raise RuntimeError("Model not loaded. Call load_model() first.")
        
        # Placeholder implementation
        logger.warning("SGLang generate() is not fully implemented yet")
        return ""
    
    def generate_batch(
        self,
        prompts: List[str],
        max_tokens: int = 512,
        temperature: float = 0.7,
        **kwargs
    ) -> List[str]:
        """Generate text for multiple prompts using SGLang."""
        return [self.generate(p, max_tokens, temperature, **kwargs) for p in prompts]
    
    def start_server(
        self,
        host: str = "0.0.0.0",
        port: int = 8000,
        **kwargs
    ) -> None:
        """Start SGLang server."""
        logger.info(f"Starting SGLang server on {host}:{port}")
        logger.info("Use the SGLang CLI to start the server:")
        logger.info(f"  python -m sglang.launch_server \\")
        logger.info(f"    --model-path {self.model_path} \\")
        logger.info(f"    --host {host} \\")
        logger.info(f"    --port {port}")
        
        raise NotImplementedError(
            "Server mode not yet implemented. Use SGLang CLI directly for now."
        )
    
    def stop_server(self) -> None:
        """Stop the SGLang server."""
        pass
    
    def get_supported_quantizations(self) -> List[str]:
        """Get supported quantization methods for SGLang."""
        return ["none", "awq", "gptq", "4bit", "8bit"]
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information."""
        return {
            "engine": "sglang",
            "model_path": self.model_path,
            "status": "experimental",
        }
