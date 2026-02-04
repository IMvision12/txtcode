"""SGLang engine adapter."""

from typing import Dict, Any, List
import time
from benchx.engines.base import BaseEngine, EngineConfig


class SGLangEngine(BaseEngine):
    """Adapter for SGLang inference engine."""
    
    def initialize(self) -> None:
        """Initialize SGLang engine."""
        try:
            from sglang import Engine
            
            print(f"    Loading model: {self.config.model}")
            
            # Initialize SGLang offline engine
            self.engine = Engine(
                model_path=self.config.model,
                tp_size=self.config.tensor_parallel_size,
                mem_fraction_static=self.config.gpu_memory_utilization,
                dtype=self.config.dtype if self.config.dtype != "auto" else None,
                trust_remote_code=True,
                **self.config.extra_params
            )
            
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
            }
            
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
            }
            
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
