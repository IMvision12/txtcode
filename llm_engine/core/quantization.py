"""Model quantization utilities."""

import logging
from typing import Optional
from pathlib import Path

logger = logging.getLogger(__name__)


def quantize(
    model_id: str,
    method: str = "4bit",
    output_dir: Optional[str] = None,
    bits: int = 4,
    **kwargs
) -> str:
    """
    Quantize a model and save it.
    
    Args:
        model_id: HuggingFace model ID or local path
        method: Quantization method ("4bit", "8bit", "awq", "gptq", "gguf")
        output_dir: Output directory for quantized model
        bits: Number of bits for quantization
        **kwargs: Additional quantization parameters
    
    Returns:
        Path to quantized model
    
    Example:
        >>> quantized_path = quantize("meta-llama/Llama-2-7b-hf", method="awq", bits=4)
        >>> # Use the quantized model
        >>> engine = load_model(quantized_path, quantization="awq")
    """
    logger.info(f"Quantizing model: {model_id}")
    logger.info(f"Method: {method}, Bits: {bits}")
    
    if output_dir is None:
        output_dir = f"./quantized_models/{Path(model_id).name}_{method}_{bits}bit"
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    if method in ["4bit", "8bit"]:
        return _quantize_bitsandbytes(model_id, method, output_path, **kwargs)
    elif method == "awq":
        return _quantize_awq(model_id, output_path, bits, **kwargs)
    elif method == "gptq":
        return _quantize_gptq(model_id, output_path, bits, **kwargs)
    elif method == "gguf":
        return _quantize_gguf(model_id, output_path, bits, **kwargs)
    else:
        raise ValueError(f"Unknown quantization method: {method}")


def _quantize_bitsandbytes(
    model_id: str,
    method: str,
    output_path: Path,
    **kwargs
) -> str:
    """Quantize using BitsAndBytes."""
    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
    except ImportError:
        raise ImportError(
            "Required packages not installed. Install with: "
            "pip install llm-engine[bitsandbytes]"
        )
    
    logger.info(f"Loading model for {method} quantization...")
    
    # Configure quantization
    if method == "4bit":
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
        )
    else:  # 8bit
        bnb_config = BitsAndBytesConfig(
            load_in_8bit=True,
        )
    
    # Load and quantize
    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        quantization_config=bnb_config,
        device_map="auto",
    )
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    
    # Save quantized model
    logger.info(f"Saving quantized model to {output_path}")
    model.save_pretrained(str(output_path))
    tokenizer.save_pretrained(str(output_path))
    
    logger.info("Quantization complete!")
    return str(output_path)


def _quantize_awq(
    model_id: str,
    output_path: Path,
    bits: int,
    **kwargs
) -> str:
    """Quantize using AWQ."""
    logger.error("AWQ quantization not yet implemented")
    raise NotImplementedError(
        "AWQ quantization coming soon. "
        "For now, use pre-quantized AWQ models from HuggingFace."
    )


def _quantize_gptq(
    model_id: str,
    output_path: Path,
    bits: int,
    **kwargs
) -> str:
    """Quantize using GPTQ."""
    logger.error("GPTQ quantization not yet implemented")
    raise NotImplementedError(
        "GPTQ quantization coming soon. "
        "For now, use pre-quantized GPTQ models from HuggingFace."
    )


def _quantize_gguf(
    model_id: str,
    output_path: Path,
    bits: int,
    **kwargs
) -> str:
    """Quantize to GGUF format."""
    logger.error("GGUF quantization not yet implemented")
    raise NotImplementedError(
        "GGUF quantization coming soon. "
        "For now, use pre-quantized GGUF models."
    )
