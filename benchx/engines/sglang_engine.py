"""SGLang engine adapter."""

from typing import Dict, Any, List
import time
from benchx.engines.base import BaseEngine, EngineConfig


class SGLangEngine(BaseEngine):
    """Adapter for SGLang inference engine.
    
    Supports all SGLang parameters including:
    - Quantization: fp8, awq, gptq, marlin, bitsandbytes, gguf, torchao
    - Parallelism: tp_size, pp_size, dp_size, ep_size
    - Memory: mem_fraction_static, max_total_tokens, chunked_prefill_size
    - Optimization: attention_backend, enable_radix_cache, speculative_algorithm
    - Structured outputs: json_schema, regex, ebnf via sampling_params
    
    Example:
        config = EngineConfig(
            model="meta-llama/Meta-Llama-3-8B-Instruct",
            quantization="fp8",
            gpu_memory_utilization=0.85,  # Maps to mem_fraction_static
            tensor_parallel_size=2,        # Maps to tp_size
            engine_kwargs={
                "max_running_requests": 128,
                "chunked_prefill_size": 8192,
                "attention_backend": "fa3",
                "enable_lora": True,
                "max_lora_rank": 64,
            }
        )
        engine = SGLangEngine(config)
    """
    
    def initialize(self) -> None:
        """Initialize SGLang engine with full parameter support."""
        try:
            from sglang import Engine
            
            print(f"    Loading model: {self.config.model}")
            
            # Build SGLang initialization arguments
            sglang_args = {
                "model_path": self.config.model,
                "tp_size": self.config.tensor_parallel_size,
                "pp_size": self.config.pipeline_parallel_size,
                "mem_fraction_static": self.config.gpu_memory_utilization,
                "dtype": self.config.dtype if self.config.dtype != "auto" else None,
                "quantization": self.config.quantization,
                "trust_remote_code": self.config.trust_remote_code,
            }
            
            # Add all engine-specific kwargs
            sglang_args.update(self.config.engine_kwargs)
            
            # Remove None values
            sglang_args = {k: v for k, v in sglang_args.items() if v is not None}
            
            # Initialize SGLang offline engine
            self.engine = Engine(**sglang_args)
            
            print(f"    ✓ Model loaded successfully")
            
        except ImportError:
            raise ImportError(
                "SGLang not installed. Install with: pip install sglang\n"
                "Or install benchx with engine support: pip install benchx[engines]"
            )
        except Exception as e:
            raise RuntimeError(f"Failed to initialize SGLang: {str(e)}")
    
    def generate(self, prompt: str, max_tokens: int = 256, **kwargs) -> Dict[str, Any]:
        """Generate with SGLang and collect metrics."""
        start_time = time.perf_counter()
        
        try:
            # SGLang generate returns a list of outputs
            sampling_params = {
                "max_new_tokens": max_tokens,
                "temperature": kwargs.get("temperature", 0.7),
                "top_p": kwargs.get("top_p", 1.0),
                "top_k": kwargs.get("top_k", -1),
                "presence_penalty": kwargs.get("presence_penalty", 0.0),
                "frequency_penalty": kwargs.get("frequency_penalty", 0.0),
                "repetition_penalty": kwargs.get("repetition_penalty", 1.0),
                "stop": kwargs.get("stop"),
                "stop_token_ids": kwargs.get("stop_token_ids"),
                "ignore_eos": kwargs.get("ignore_eos", False),
            }
            
            # Add structured output constraints if provided
            if "json_schema" in kwargs:
                sampling_params["json_schema"] = kwargs["json_schema"]
            if "regex" in kwargs:
                sampling_params["regex"] = kwargs["regex"]
            if "ebnf" in kwargs:
                sampling_params["ebnf"] = kwargs["ebnf"]
            
            # Remove None values
            sampling_params = {k: v for k, v in sampling_params.items() if v is not None}
            
            outputs = self.engine.generate(
                [prompt],
                sampling_params=sampling_params
            )
            
            end_time = time.perf_counter()
            
            output = outputs[0]
            generated_text = output["text"]
            
            # Calculate tokens (rough estimate if not provided)
            tokens_generated = len(generated_text.split())
            
            return {
                "text": generated_text,
                "total_time": end_time - start_time,
                "tokens_generated": tokens_generated,
                "engine": "sglang",
            }
            
        except Exception as e:
            return {
                "error": str(e),
                "total_time": time.perf_counter() - start_time,
                "tokens_generated": 0,
                "engine": "sglang",
            }
    
    def batch_generate(self, prompts: List[str], max_tokens: int = 256, **kwargs) -> List[Dict[str, Any]]:
        """Batch generation with SGLang."""
        start_time = time.perf_counter()
        
        try:
            sampling_params = {
                "max_new_tokens": max_tokens,
                "temperature": kwargs.get("temperature", 0.7),
                "top_p": kwargs.get("top_p", 1.0),
                "top_k": kwargs.get("top_k", -1),
                "presence_penalty": kwargs.get("presence_penalty", 0.0),
                "frequency_penalty": kwargs.get("frequency_penalty", 0.0),
                "repetition_penalty": kwargs.get("repetition_penalty", 1.0),
                "stop": kwargs.get("stop"),
                "stop_token_ids": kwargs.get("stop_token_ids"),
                "ignore_eos": kwargs.get("ignore_eos", False),
            }
            
            # Add structured output constraints if provided
            if "json_schema" in kwargs:
                sampling_params["json_schema"] = kwargs["json_schema"]
            if "regex" in kwargs:
                sampling_params["regex"] = kwargs["regex"]
            if "ebnf" in kwargs:
                sampling_params["ebnf"] = kwargs["ebnf"]
            
            # Remove None values
            sampling_params = {k: v for k, v in sampling_params.items() if v is not None}
            
            outputs = self.engine.generate(
                prompts,
                sampling_params=sampling_params
            )
            
            end_time = time.perf_counter()
            batch_time = end_time - start_time
            
            results = []
            for output in outputs:
                generated_text = output["text"]
                tokens_generated = len(generated_text.split())
                
                results.append({
                    "text": generated_text,
                    "total_time": batch_time / len(prompts),  # Estimate per-request time
                    "tokens_generated": tokens_generated,
                    "batch_time": batch_time,
                    "engine": "sglang",
                })
            
            return results
            
        except Exception as e:
            return [{
                "error": str(e),
                "total_time": time.perf_counter() - start_time,
                "tokens_generated": 0,
                "engine": "sglang",
            } for _ in prompts]
    
    def get_memory_usage(self) -> Dict[str, float]:
        """Get GPU memory usage."""
        try:
            import torch
            if torch.cuda.is_available():
                memory_stats = {}
                for i in range(torch.cuda.device_count()):
                    allocated = torch.cuda.memory_allocated(i) / 1e9
                    reserved = torch.cuda.memory_reserved(i) / 1e9
                    memory_stats[f"gpu_{i}_allocated_gb"] = allocated
                    memory_stats[f"gpu_{i}_reserved_gb"] = reserved
                
                memory_stats["total_allocated_gb"] = sum(
                    v for k, v in memory_stats.items() if "allocated" in k
                )
                memory_stats["total_reserved_gb"] = sum(
                    v for k, v in memory_stats.items() if "reserved" in k
                )
                
                return memory_stats
        except ImportError:
            pass
        
        return {"allocated_gb": 0, "reserved_gb": 0}
    
    def shutdown(self) -> None:
        """Clean up SGLang resources."""
        if self.engine:
            try:
                self.engine.shutdown()
                self.engine = None
                
                # Force garbage collection
                import gc
                gc.collect()
                
                # Clear CUDA cache
                try:
                    import torch
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                except ImportError:
                    pass
                    
            except Exception as e:
                print(f"Warning: Error during SGLang shutdown: {e}")
