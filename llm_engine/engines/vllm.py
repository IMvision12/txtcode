import logging
from typing import List, Dict, Any, Optional, Union, Literal
from dataclasses import dataclass, field
from llm_engine.engines.base import InferenceEngine
from llm_engine.utils.config import EngineConfig, QuantizationConfig

logger = logging.getLogger(__name__)


@dataclass
class VLLMConfig:
    
    model: str
    tokenizer: Optional[str] = None
    tokenizer_mode: Literal["auto", "slow", "fast"] = "auto"
    trust_remote_code: bool = False
    dtype: Literal["auto", "float16", "bfloat16", "float32"] = "auto"
    quantization: Optional[Literal["awq", "gptq", "marlin", "gguf", "bitsandbytes", "fp8", "fbgemm_fp8", "modelopt", "torchao"]] = None
    max_model_len: Optional[int] = None
    gpu_memory_utilization: float = 0.9
    enforce_eager: bool = False
    max_logprobs: int = 20
    disable_sliding_window: bool = False
    skip_tokenizer_init: bool = False
    revision: Optional[str] = None
    tokenizer_revision: Optional[str] = None
    seed: int = 0
    
    load_format: Literal["auto", "pt", "safetensors", "npcache", "dummy", "tensorizer", "gguf", "bitsandbytes", "sharded_state", "mistral"] = "auto"
    download_dir: Optional[str] = None
    model_loader_extra_config: Optional[Dict] = None
    ignore_patterns: Optional[List[str]] = None
    
    tensor_parallel_size: int = 1
    pipeline_parallel_size: int = 1
    context_parallel_size: int = 1
    data_parallel_size: int = 1
    
    block_size: int = 16
    swap_space: int = 4
    kv_cache_dtype: Literal["auto", "bfloat16", "fp8", "fp8_e4m3", "fp8_e5m2"] = "auto"
    enable_prefix_caching: bool = False
    
    max_num_batched_tokens: Optional[int] = None
    max_num_seqs: int = 256
    block_size: int = 16
    swap_space: int = 4
    kv_cache_dtype: Literal["auto", "bfloat16", "fp8", "fp8_e4m3", "fp8_e5m2"] = "auto"
    enable_prefix_caching: bool = False
    
    # SchedulerConfig
    max_num_batched_tokens: Optional[int] = None
    max_num_seqs: int = 256
    num_scheduler_steps: int = 1
    scheduling_policy: Literal["fcfs", "priority"] = "fcfs"
    enable_chunked_prefill: Optional[bool] = None
    
    # LoRAConfig
    enable_lora: bool = False
    max_loras: int = 1
    max_lora_rank: int = 16
    lora_dtype: Literal["auto", "float16", "bfloat16"] = "auto"
    
    # MultiModalConfig
    limit_mm_per_prompt: Optional[Dict] = None
    
    # Additional options
    disable_custom_all_reduce: bool = False
    max_context_len_to_capture: Optional[int] = None
    max_seq_len_to_capture: int = 8192


@dataclass
class VLLMSamplingParams:
    """vLLM sampling parameters matching v0.15.0."""
    
    n: int = 1
    best_of: Optional[int] = None
    presence_penalty: float = 0.0
    frequency_penalty: float = 0.0
    repetition_penalty: float = 1.0
    temperature: float = 1.0
    top_p: float = 1.0
    top_k: int = -1
    min_p: float = 0.0
    seed: Optional[int] = None
    use_beam_search: bool = False
    length_penalty: float = 1.0
    early_stopping: Union[bool, str] = False
    stop: Optional[Union[str, List[str]]] = None
    stop_token_ids: Optional[List[int]] = None
    include_stop_str_in_output: bool = False
    ignore_eos: bool = False
    max_tokens: int = 16
    min_tokens: int = 0
    logprobs: Optional[int] = None
    prompt_logprobs: Optional[int] = None
    detokenize: bool = True
    skip_special_tokens: bool = True
    spaces_between_special_tokens: bool = True


class VLLMEngine(InferenceEngine):
    """
    vLLM inference engine adapter with full v0.15.0 parameter support.
    
    Supports all quantization methods:
    - AWQ (4-bit, activation-aware)
    - GPTQ (4-bit, 8-bit)
    - Marlin (optimized kernel for AWQ/GPTQ)
    - GGUF (llama.cpp format)
    - BitsandBytes (4-bit, 8-bit, on-the-fly)
    - FP8 (8-bit floating point)
    - FBGEMM FP8
    - ModelOpt (NVIDIA)
    - TorchAO
    """
    
    SUPPORTED_QUANTIZATIONS = [
        "none", "awq", "gptq", "marlin", "gguf", 
        "bitsandbytes", "fp8", "fbgemm_fp8", "modelopt", "torchao"
    ]
    
    def __init__(
        self,
        model_path: str,
        engine_config: Optional[EngineConfig] = None,
        quantization_config: Optional[QuantizationConfig] = None,
        vllm_config: Optional[VLLMConfig] = None,
    ):
        """
        Initialize vLLM engine.
        
        Args:
            model_path: HuggingFace model ID or local path
            engine_config: Generic engine configuration
            quantization_config: Generic quantization configuration
            vllm_config: vLLM-specific configuration (overrides generic configs)
        """
        super().__init__(model_path, engine_config, quantization_config)
        self.llm = None
        self.vllm_config = vllm_config or self._create_vllm_config()
    
    def _create_vllm_config(self) -> VLLMConfig:
        """Create vLLM config from generic configs."""
        # Map quantization method
        quant_method = None
        if self.quantization_config.method != "none":
            if self.quantization_config.method == "4bit":
                quant_method = "bitsandbytes"
            elif self.quantization_config.method == "8bit":
                quant_method = "bitsandbytes"
            else:
                quant_method = self.quantization_config.method
        
        return VLLMConfig(
            model=self.model_path,
            tensor_parallel_size=self.engine_config.tensor_parallel,
            dtype=self.engine_config.dtype,
            trust_remote_code=self.engine_config.trust_remote_code,
            gpu_memory_utilization=self.engine_config.gpu_memory_utilization,
            max_model_len=self.engine_config.max_seq_length,
            quantization=quant_method,
            max_num_seqs=self.engine_config.max_batch_size,
        )
    
    def load_model(self) -> None:
        """Load model using vLLM with full configuration support."""
        try:
            from vllm import LLM
        except ImportError:
            raise ImportError(
                "vLLM is not installed. Install it with: pip install llm-engine[vllm]"
            )
        
        logger.info(f"Loading model {self.model_path} with vLLM...")
        logger.info(f"Quantization: {self.vllm_config.quantization}")
        logger.info(f"Tensor Parallel: {self.vllm_config.tensor_parallel_size}")
        logger.info(f"GPU Memory Utilization: {self.vllm_config.gpu_memory_utilization}")
        
        # Build kwargs from VLLMConfig
        llm_kwargs = {
            "model": self.vllm_config.model,
            "tokenizer": self.vllm_config.tokenizer,
            "tokenizer_mode": self.vllm_config.tokenizer_mode,
            "trust_remote_code": self.vllm_config.trust_remote_code,
            "dtype": self.vllm_config.dtype,
            "quantization": self.vllm_config.quantization,
            "revision": self.vllm_config.revision,
            "tokenizer_revision": self.vllm_config.tokenizer_revision,
            "seed": self.vllm_config.seed,
            "gpu_memory_utilization": self.vllm_config.gpu_memory_utilization,
            "swap_space": self.vllm_config.swap_space,
            "enforce_eager": self.vllm_config.enforce_eager,
            "max_context_len_to_capture": self.vllm_config.max_context_len_to_capture,
            "max_seq_len_to_capture": self.vllm_config.max_seq_len_to_capture,
            "disable_custom_all_reduce": self.vllm_config.disable_custom_all_reduce,
            "tensor_parallel_size": self.vllm_config.tensor_parallel_size,
            "pipeline_parallel_size": self.vllm_config.pipeline_parallel_size,
        }
        
        # Add optional parameters
        if self.vllm_config.max_model_len:
            llm_kwargs["max_model_len"] = self.vllm_config.max_model_len
        
        if self.vllm_config.download_dir:
            llm_kwargs["download_dir"] = self.vllm_config.download_dir
        
        if self.vllm_config.load_format != "auto":
            llm_kwargs["load_format"] = self.vllm_config.load_format
        
        if self.vllm_config.enable_lora:
            llm_kwargs["enable_lora"] = True
            llm_kwargs["max_loras"] = self.vllm_config.max_loras
            llm_kwargs["max_lora_rank"] = self.vllm_config.max_lora_rank
        
        if self.vllm_config.enable_prefix_caching:
            llm_kwargs["enable_prefix_caching"] = True
        
        if self.vllm_config.kv_cache_dtype != "auto":
            llm_kwargs["kv_cache_dtype"] = self.vllm_config.kv_cache_dtype
        
        # Remove None values
        llm_kwargs = {k: v for k, v in llm_kwargs.items() if v is not None}
        
        # Initialize vLLM
        self.llm = LLM(**llm_kwargs)
        
        logger.info("✅ Model loaded successfully with vLLM")
    
    def generate(
        self,
        prompt: str,
        max_tokens: int = 512,
        temperature: float = 0.7,
        top_p: float = 0.9,
        top_k: int = 50,
        **kwargs
    ) -> str:
        """
        Generate text using vLLM.
        
        Args:
            prompt: Input text prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0.0 = greedy)
            top_p: Nucleus sampling parameter
            top_k: Top-k sampling parameter
            **kwargs: Additional sampling parameters (see VLLMSamplingParams)
        
        Returns:
            Generated text
        """
        if self.llm is None:
            raise RuntimeError("Model not loaded. Call load_model() first.")
        
        from vllm import SamplingParams
        
        sampling_params = SamplingParams(
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            top_k=top_k,
            **kwargs
        )
        
        outputs = self.llm.generate([prompt], sampling_params)
        return outputs[0].outputs[0].text
    
    def generate_batch(
        self,
        prompts: List[str],
        max_tokens: int = 512,
        temperature: float = 0.7,
        top_p: float = 0.9,
        top_k: int = 50,
        **kwargs
    ) -> List[str]:
        """
        Generate text for multiple prompts using vLLM.
        
        Args:
            prompts: List of input prompts
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            top_p: Nucleus sampling parameter
            top_k: Top-k sampling parameter
            **kwargs: Additional sampling parameters
        
        Returns:
            List of generated texts
        """
        if self.llm is None:
            raise RuntimeError("Model not loaded. Call load_model() first.")
        
        from vllm import SamplingParams
        
        sampling_params = SamplingParams(
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            top_k=top_k,
            **kwargs
        )
        
        outputs = self.llm.generate(prompts, sampling_params)
        return [output.outputs[0].text for output in outputs]
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 512,
        temperature: float = 0.7,
        **kwargs
    ) -> str:
        """
        Chat completion for instruction-tuned models.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            **kwargs: Additional sampling parameters
        
        Returns:
            Generated response
        
        Example:
            >>> messages = [
            ...     {"role": "system", "content": "You are a helpful assistant."},
            ...     {"role": "user", "content": "What is AI?"}
            ... ]
            >>> response = engine.chat(messages)
        """
        if self.llm is None:
            raise RuntimeError("Model not loaded. Call load_model() first.")
        
        from vllm import SamplingParams
        
        sampling_params = SamplingParams(
            max_tokens=max_tokens,
            temperature=temperature,
            **kwargs
        )
        
        outputs = self.llm.chat(
            messages=[messages],
            sampling_params=sampling_params
        )
        
        return outputs[0].outputs[0].text
    
    def encode(self, prompt: str) -> List[int]:
        """
        Encode text to token IDs.
        
        Args:
            prompt: Text to encode
        
        Returns:
            List of token IDs
        """
        if self.llm is None:
            raise RuntimeError("Model not loaded. Call load_model() first.")
        
        return self.llm.encode(prompt)
    
    def start_server(
        self,
        host: str = "0.0.0.0",
        port: int = 8000,
        **kwargs
    ) -> None:
        """Start vLLM OpenAI-compatible server."""
        logger.info(f"Starting vLLM server on {host}:{port}")
        logger.info("Use the vLLM CLI to start the server:")
        logger.info(f"  vllm serve {self.model_path} \\")
        logger.info(f"    --host {host} \\")
        logger.info(f"    --port {port} \\")
        logger.info(f"    --tensor-parallel-size {self.vllm_config.tensor_parallel_size}")
        
        if self.vllm_config.quantization:
            logger.info(f"    --quantization {self.vllm_config.quantization}")
        
        raise NotImplementedError(
            "Server mode not yet implemented. Use vLLM CLI directly for now."
        )
    
    def stop_server(self) -> None:
        """Stop the vLLM server."""
        pass
    
    def get_supported_quantizations(self) -> List[str]:
        """Get supported quantization methods for vLLM."""
        return self.SUPPORTED_QUANTIZATIONS
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information."""
        if self.llm is None:
            return {"status": "not_loaded"}
        
        return {
            "engine": "vllm",
            "version": "0.15.0",
            "model_path": self.model_path,
            "tensor_parallel": self.vllm_config.tensor_parallel_size,
            "pipeline_parallel": self.vllm_config.pipeline_parallel_size,
            "quantization": self.vllm_config.quantization,
            "dtype": self.vllm_config.dtype,
            "max_model_len": self.vllm_config.max_model_len,
            "gpu_memory_utilization": self.vllm_config.gpu_memory_utilization,
            "enable_prefix_caching": self.vllm_config.enable_prefix_caching,
            "kv_cache_dtype": self.vllm_config.kv_cache_dtype,
        }
    
    def set_quantization(self, method: str) -> None:
        """
        Set quantization method.
        
        Supported methods:
        - awq: 4-bit AWQ quantization
        - gptq: 4-bit/8-bit GPTQ quantization
        - marlin: Optimized kernel for AWQ/GPTQ
        - gguf: llama.cpp GGUF format
        - bitsandbytes: 4-bit/8-bit on-the-fly quantization
        - fp8: 8-bit floating point (H100+)
        - fbgemm_fp8: FBGEMM FP8
        - modelopt: NVIDIA ModelOpt
        - torchao: TorchAO quantization
        """
        if method not in self.SUPPORTED_QUANTIZATIONS:
            raise ValueError(
                f"Unsupported quantization method: {method}. "
                f"Supported: {self.SUPPORTED_QUANTIZATIONS}"
            )
        
        self.vllm_config.quantization = method if method != "none" else None
        logger.info(f"Quantization method set to: {method}")
