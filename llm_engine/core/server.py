"""Server management for LLM inference."""

import logging
from typing import Optional, Union
from llm_engine.core.model import load_model
from llm_engine.engines.base import InferenceEngine
from llm_engine.utils.config import EngineConfig, QuantizationConfig, ServerConfig

logger = logging.getLogger(__name__)


def serve(
    model_id: str,
    engine: Optional[str] = "auto",
    quantization: Optional[str] = "none",
    host: str = "0.0.0.0",
    port: int = 8000,
    engine_config: Optional[EngineConfig] = None,
    quantization_config: Optional[QuantizationConfig] = None,
    server_config: Optional[ServerConfig] = None,
) -> InferenceEngine:
    """
    Serve a model with an OpenAI-compatible API.
    
    Args:
        model_id: HuggingFace model ID or local path
        engine: Engine name or "auto"
        quantization: Quantization method
        host: Server host
        port: Server port
        engine_config: Engine configuration
        quantization_config: Quantization configuration
        server_config: Server configuration
    
    Returns:
        Running inference engine
    
    Example:
        >>> server = serve("meta-llama/Llama-2-7b-hf", engine="vllm", port=8000)
        >>> # Server is now running at http://localhost:8000
    """
    logger.info(f"Starting server for model: {model_id}")
    logger.info(f"Engine: {engine}, Quantization: {quantization}")
    logger.info(f"Server will be available at http://{host}:{port}")
    
    # Load the model
    engine_instance = load_model(
        model_id=model_id,
        engine=engine,
        quantization=quantization,
        engine_config=engine_config,
        quantization_config=quantization_config,
    )
    
    # Start the server
    try:
        engine_instance.start_server(host=host, port=port)
    except NotImplementedError:
        logger.warning(
            f"Server mode not yet implemented for {engine}. "
            "Model is loaded and ready for generate() calls."
        )
        logger.info("You can use the engine programmatically:")
        logger.info(f"  response = engine.generate('Your prompt here')")
    
    return engine_instance


class ServerManager:
    """Manage multiple inference servers."""
    
    def __init__(self):
        self.servers = {}
    
    def start_server(
        self,
        name: str,
        model_id: str,
        **kwargs
    ) -> InferenceEngine:
        """Start a named server."""
        if name in self.servers:
            raise ValueError(f"Server '{name}' already exists")
        
        server = serve(model_id, **kwargs)
        self.servers[name] = server
        return server
    
    def stop_server(self, name: str) -> None:
        """Stop a named server."""
        if name not in self.servers:
            raise ValueError(f"Server '{name}' not found")
        
        server = self.servers[name]
        server.stop_server()
        server.unload_model()
        del self.servers[name]
    
    def list_servers(self) -> list:
        """List all running servers."""
        return list(self.servers.keys())
    
    def get_server(self, name: str) -> InferenceEngine:
        """Get a server by name."""
        if name not in self.servers:
            raise ValueError(f"Server '{name}' not found")
        return self.servers[name]
