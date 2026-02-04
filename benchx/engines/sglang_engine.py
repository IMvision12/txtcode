"""SGLang engine adapter."""

from typing import Dict, Any, List
import time
from benchx.engines.base import BaseEngine, EngineConfig


class SGLangEngine(BaseEngine):
    """Adapter for SGLang inference engine."""
    
    def initialize(self) -> None:
        """Initialize SGLang engine."""
        try:
            import sglang as sgl
            self.sgl = sgl
            
            # SGLang uses different parameter names
            self.engine = sgl.Engine(
                model_path=self.config.model,
                tp_size=self.config.tensor_parallel_size,
                mem_fraction_static=self.config.gpu_memory_utilization,
                **self.config.extra_params
            )
        except ImportError:
            raise ImportError("SGLang not installed. Install with: pip install sglang")
    
    def generate(self, prompt: str, max_tokens: int = 256, **kwargs) -> Dict[str, Any]:
        """Generate with SGLang and collect metrics."""
        start_time = time.perf_counter()
        
        output = self.engine.generate(
            prompt,
            max_new_tokens=max_tokens,
            temperature=kwargs.get("temperature", 0.7),
        )
        
        end_time = time.perf_counter()
        
        return {
            "text": output["text"],
            "total_time": end_time - start_time,
            "tokens_generated": output.get("num_tokens", 0),
            "engine": "sglang",
        }
    
    def batch_generate(self, prompts: List[str], max_tokens: int = 256, **kwargs) -> List[Dict[str, Any]]:
        """Batch generation with SGLang."""
        start_time = time.perf_counter()
        
        outputs = self.engine.generate(
            prompts,
            max_new_tokens=max_tokens,
            temperature=kwargs.get("temperature", 0.7),
        )
        
        end_time = time.perf_counter()
        batch_time = end_time - start_time
        
        results = []
        for output in outputs:
            results.append({
                "text": output["text"],
                "tokens_generated": output.get("num_tokens", 0),
                "batch_time": batch_time,
                "engine": "sglang",
            })
        
        return results
    
    def get_memory_usage(self) -> Dict[str, float]:
        """Get GPU memory usage."""
        try:
            import torch
            if torch.cuda.is_available():
                return {
                    "allocated_gb": torch.cuda.memory_allocated() / 1e9,
                    "reserved_gb": torch.cuda.memory_reserved() / 1e9,
                }
        except ImportError:
            pass
        return {"allocated_gb": 0, "reserved_gb": 0}
    
    def shutdown(self) -> None:
        """Clean up SGLang resources."""
        if self.engine:
            self.engine.shutdown()
            self.engine = None
