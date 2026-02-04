"""vLLM engine adapter."""

from typing import Dict, Any, List, Optional
import time
from benchx.engines.base import BaseEngine, EngineConfig


class VLLMEngine(BaseEngine):
    """Adapter for vLLM inference engine."""
    
    def initialize(self) -> None:
        """Initialize vLLM engine."""
        try:
            from vllm import LLM, SamplingParams
            self.SamplingParams = SamplingParams
            
            print(f"    Loading model: {self.config.model}")
            self.engine = LLM(
                model=self.config.model,
                tensor_parallel_size=self.config.tensor_parallel_size,
                gpu_memory_utilization=self.config.gpu_memory_utilization,
                dtype=self.config.dtype,
                trust_remote_code=True,
                **self.config.extra_params
            )
            print(f"    ✓ Model loaded successfully")
        except ImportError:
            raise ImportError(
                "vLLM not installed. Install with: pip install vllm\n"
                "Or install benchx with engine support: pip install benchx[engines]"
            )
        except Exception as e:
            raise RuntimeError(f"Failed to initialize vLLM: {str(e)}")
    
    def generate(self, prompt: str, max_tokens: int = 256, **kwargs) -> Dict[str, Any]:
        """Generate with vLLM and collect detailed metrics."""
        sampling_params = self.SamplingParams(
            max_tokens=max_tokens,
            temperature=kwargs.get("temperature", 0.7),
            top_p=kwargs.get("top_p", 1.0),
        )
        
        # Track timing
        start_time = time.perf_counter()
        first_token_time = None
        
        try:
            outputs = self.engine.generate([prompt], sampling_params)
            end_time = time.perf_counter()
            
            output = outputs[0]
            generated_text = output.outputs[0].text
            tokens_generated = len(output.outputs[0].token_ids)
            
            # Estimate TTFT (vLLM doesn't provide this directly in offline mode)
            # In a real implementation, you'd use the online API or streaming
            total_time = end_time - start_time
            estimated_ttft = total_time * 0.1  # Rough estimate: 10% of total time
            
            return {
                "text": generated_text,
                "total_time": total_time,
                "ttft": estimated_ttft,
                "tokens_generated": tokens_generated,
                "engine": "vllm",
                "prompt_tokens": len(prompt.split()),  # Rough estimate
                "finish_reason": output.outputs[0].finish_reason,
            }
        
        except Exception as e:
            return {
                "error": str(e),
                "total_time": time.perf_counter() - start_time,
                "tokens_generated": 0,
                "engine": "vllm",
            }
    
    def batch_generate(
        self,
        prompts: List[str],
        max_tokens: int = 256,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Batch generation with vLLM."""
        sampling_params = self.SamplingParams(
            max_tokens=max_tokens,
            temperature=kwargs.get("temperature", 0.7),
            top_p=kwargs.get("top_p", 1.0),
        )
        
        start_time = time.perf_counter()
        
        try:
            outputs = self.engine.generate(prompts, sampling_params)
            end_time = time.perf_counter()
            
            batch_time = end_time - start_time
            results = []
            
            for i, output in enumerate(outputs):
                # Estimate per-request timing
                estimated_time = batch_time / len(prompts)
                estimated_ttft = estimated_time * 0.1
                
                results.append({
                    "text": output.outputs[0].text,
                    "total_time": estimated_time,
                    "ttft": estimated_ttft,
                    "tokens_generated": len(output.outputs[0].token_ids),
                    "batch_time": batch_time,
                    "engine": "vllm",
                    "finish_reason": output.outputs[0].finish_reason,
                })
            
            return results
        
        except Exception as e:
            return [{
                "error": str(e),
                "total_time": time.perf_counter() - start_time,
                "tokens_generated": 0,
                "engine": "vllm",
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
                
                # Total across all GPUs
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
        """Clean up vLLM resources."""
        if self.engine:
            try:
                del self.engine
                self.engine = None
                
                # Force garbage collection
                import gc
                gc.collect()
                
                # Clear CUDA cache if available
                try:
                    import torch
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                except ImportError:
                    pass
            except Exception as e:
                print(f"Warning: Error during vLLM shutdown: {e}")
