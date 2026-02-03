"""Model loading and management."""

import logging
from typing import Optional
from llm_engine.engines.base import InferenceEngine
from llm_engine.utils.config import EngineConfig, QuantizationConfig, ModelConfig
from llm_engine.utils.hardware import detect_hardware

logger = logging.getLogger(__name__)


def select_engine(
    model_id: str,
    engine_name: str = "auto",
    hardware_info: Optional[dict] = None
) -> str:
    """
    Select the best inference engine based on model and hardware.
    
    Args:
        model_id: Model identifier
        engine_name: Requested engine name or "auto"
        hardware_info: Hardware information
    
    Returns:
        Selected engine name
    """
    if engine_name != "auto":
        return engine_name
    
    if hardware_info is None:
        hardware_info = detect_hardware()
    
    # Auto-selection logic
    if not hardware_info["gpu_available"]:
        logger.info("No GPU detected, selecting llama.cpp for CPU inference")
        return "llamacpp"
    
    if hardware_info["gpu_type"] == "nvidia":
        # Check GPU memory
        if hardware_info["gpu_memory_gb"] >= 24:
            logger.info("High-end NVIDIA GPU detected, selecting vLLM")
            return "vllm"
        else:
            logger.info("NVIDIA GPU detected, selecting vLLM")
            return "vllm"
    
    elif hardware_info["gpu_type"] == "amd":
        logger.info("AMD GPU detected, selecting vLLM (ROCm)")
        return "vllm"
    
    elif hardware_info["gpu_type"] == "apple_silicon":
        logger.info("Apple Silicon detected, selecting llama.cpp")
        return "llamacpp"
    
    # Default fallback
    logger.info("Using vLLM as default engine")
    return "vllm"


def load_model(
    model_id: str,
    engine: Optional[str] = "auto",
    quantization: Optional[str] = "none",
    engine_config: Optional[EngineConfig] = None,
    quantization_config: Optional[QuantizationConfig] = None,
) -> InferenceEngine:
    """
    Load a model with the specified engine and quantization.
    
    Args:
        model_id: HuggingFace model ID or local path
        engine: Engine name ("vllm", "sglang", "tgi", etc.) or "auto"
        quantization: Quantization method or "none"
        engine_config: Engine configuration
        quantization_config: Quantization configuration
    
    Returns:
        Loaded inference engine
    
    Example:
        >>> engine = load_model("meta-llama/Llama-2-7b-hf", engine="vllm", quantization="4bit")
        >>> response = engine.generate("Hello, world!")
    """
    # Select engine
    selected_engine = select_engine(model_id, engine)
    
    # Create configs if not provided
    if engine_config is None:
        engine_config = EngineConfig(name=selected_engine)
    
    if quantization_config is None:
        quantization_config = QuantizationConfig(method=quantization)
    
    # Import and instantiate the appropriate engine
    if selected_engine == "vllm":
        from llm_engine.engines.vllm import VLLMEngine
        engine_instance = VLLMEngine(model_id, engine_config, quantization_config)
    
    elif selected_engine == "sglang":
        from llm_engine.engines.sglang import SGLangEngine
        engine_instance = SGLangEngine(model_id, engine_config, quantization_config)
    
    elif selected_engine == "tgi":
        logger.error("TGI engine not yet implemented")
        raise NotImplementedError("TGI engine coming soon")
    
    elif selected_engine == "tensorrt":
        logger.error("TensorRT-LLM engine not yet implemented")
        raise NotImplementedError("TensorRT-LLM engine coming soon")
    
    elif selected_engine == "exllama":
        logger.error("ExLlamaV2 engine not yet implemented")
        raise NotImplementedError("ExLlamaV2 engine coming soon")
    
    elif selected_engine == "llamacpp":
        logger.error("llama.cpp engine not yet implemented")
        raise NotImplementedError("llama.cpp engine coming soon")
    
    else:
        raise ValueError(f"Unknown engine: {selected_engine}")
    
    # Load the model
    engine_instance.load_model()
    
    return engine_instance
