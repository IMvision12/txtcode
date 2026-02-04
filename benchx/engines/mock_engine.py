"""Mock engine for testing without GPU resources."""

from typing import Dict, Any, List
import time
import random
from benchx.engines.base import BaseEngine, EngineConfig


class MockEngine(BaseEngine):
    """Mock engine that simulates inference for testing."""
    
    def __init__(self, config: EngineConfig):
        super().__init__(config)
        self.initialized = False
        # Simulate different performance characteristics
        self.base_ttft = 0.05  # 50ms base TTFT
        self.base_tpot = 0.01  # 10ms per token
        self.variance = 0.2    # 20% variance
    
    def initialize(self) -> None:
        """Initialize mock engine."""
        print(f"    Mock engine initializing for model: {self.config.model}")
        time.sleep(0.5)  # Simulate initialization time
        self.initialized = True
        print(f"    ✓ Mock engine ready")
    
    def generate(self, prompt: str, max_tokens: int = 256, **kwargs) -> Dict[str, Any]:
        """Simulate generation with realistic timing."""
        if not self.initialized:
            raise RuntimeError("Engine not initialized")
        
        # Simulate TTFT (time to first token)
        ttft = self.base_ttft * (1 + random.uniform(-self.variance, self.variance))
        time.sleep(ttft)
        
        # Simulate token generation
        tokens_to_generate = min(max_tokens, random.randint(50, max_tokens))
        
        # Simulate per-token generation time
        generation_time = 0
        for _ in range(tokens_to_generate):
            tpot = self.base_tpot * (1 + random.uniform(-self.variance, self.variance))
            time.sleep(tpot)
            generation_time += tpot
        
        total_time = ttft + generation_time
        
        # Generate mock response
        response_text = f"Mock response with {tokens_to_generate} tokens. " * (tokens_to_generate // 10)
        
        return {
            "text": response_text[:tokens_to_generate * 5],  # Rough character estimate
            "total_time": total_time,
            "ttft": ttft,
            "tokens_generated": tokens_to_generate,
            "engine": "mock",
            "prompt_tokens": len(prompt.split()),
            "finish_reason": "length" if tokens_to_generate == max_tokens else "stop",
        }
    
    def batch_generate(
        self,
        prompts: List[str],
        max_tokens: int = 256,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Simulate batch generation."""
        results = []
        
        # Simulate parallel processing with some speedup
        batch_start = time.time()
        
        for prompt in prompts:
            result = self.generate(prompt, max_tokens, **kwargs)
            results.append(result)
        
        batch_time = time.time() - batch_start
        
        # Add batch timing info
        for result in results:
            result["batch_time"] = batch_time
        
        return results
    
    def get_memory_usage(self) -> Dict[str, float]:
        """Simulate memory usage."""
        # Simulate realistic memory usage based on model size
        model_name = self.config.model.lower()
        
        if "70b" in model_name or "72b" in model_name:
            base_memory = 140  # GB for 70B model
        elif "13b" in model_name or "14b" in model_name:
            base_memory = 26
        elif "7b" in model_name or "8b" in model_name:
            base_memory = 14
        else:
            base_memory = 10  # Default
        
        # Add some variance
        allocated = base_memory * random.uniform(0.9, 1.0)
        reserved = allocated * 1.1
        
        return {
            "gpu_0_allocated_gb": allocated,
            "gpu_0_reserved_gb": reserved,
            "total_allocated_gb": allocated,
            "total_reserved_gb": reserved,
        }
    
    def shutdown(self) -> None:
        """Clean up mock engine."""
        self.initialized = False
        time.sleep(0.1)  # Simulate cleanup time
