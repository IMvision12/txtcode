"""FastAPI server for vLLM engine."""

import argparse
import time
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import psutil
import torch

app = FastAPI(title="vLLM Server")

# Global engine instance
llm = None
config = None


class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 256
    temperature: float = 1.0
    top_p: float = 1.0
    top_k: int = -1
    presence_penalty: float = 0.0
    frequency_penalty: float = 0.0


class InitializeRequest(BaseModel):
    model: str
    tensor_parallel_size: int = 1
    gpu_memory_utilization: float = 0.9
    dtype: str = "auto"
    quantization: Optional[str] = None
    trust_remote_code: bool = False
    engine_kwargs: Dict[str, Any] = {}


@app.post("/initialize")
async def initialize(request: InitializeRequest):
    """Initialize vLLM engine."""
    global llm, config
    
    try:
        from vllm import LLM, SamplingParams
        
        config = request
        
        # Build vLLM kwargs
        vllm_kwargs = {
            "model": request.model,
            "tensor_parallel_size": request.tensor_parallel_size,
            "gpu_memory_utilization": request.gpu_memory_utilization,
            "dtype": request.dtype,
            "trust_remote_code": request.trust_remote_code,
        }
        
        if request.quantization:
            vllm_kwargs["quantization"] = request.quantization
        
        # Add custom engine kwargs
        vllm_kwargs.update(request.engine_kwargs)
        
        llm = LLM(**vllm_kwargs)
        
        return {"status": "initialized", "model": request.model}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Initialization failed: {str(e)}")


@app.post("/generate")
async def generate(request: GenerateRequest):
    """Generate text using vLLM."""
    global llm
    
    if llm is None:
        raise HTTPException(status_code=400, detail="Engine not initialized")
    
    try:
        from vllm import SamplingParams
        
        # Create sampling params
        sampling_params = SamplingParams(
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            top_p=request.top_p,
            top_k=request.top_k,
            presence_penalty=request.presence_penalty,
            frequency_penalty=request.frequency_penalty,
        )
        
        # Generate
        start_time = time.perf_counter()
        outputs = llm.generate([request.prompt], sampling_params)
        end_time = time.perf_counter()
        
        output = outputs[0]
        generated_text = output.outputs[0].text
        tokens_generated = len(output.outputs[0].token_ids)
        
        # Calculate metrics
        total_time = end_time - start_time
        
        # Try to get TTFT if available
        ttft = None
        if hasattr(output, 'metrics') and output.metrics:
            ttft = output.metrics.get('time_to_first_token')
        
        return {
            "text": generated_text,
            "tokens_generated": tokens_generated,
            "total_time": total_time,
            "ttft": ttft,
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@app.get("/memory")
async def get_memory():
    """Get GPU memory usage."""
    try:
        if torch.cuda.is_available():
            memory_allocated = torch.cuda.memory_allocated() / 1024**3  # GB
            memory_reserved = torch.cuda.memory_reserved() / 1024**3  # GB
            
            return {
                "total_allocated_gb": memory_allocated,
                "total_reserved_gb": memory_reserved,
            }
        else:
            return {"error": "CUDA not available"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Memory query failed: {str(e)}")


@app.post("/shutdown")
async def shutdown():
    """Shutdown the engine."""
    global llm
    
    try:
        if llm is not None:
            del llm
            llm = None
            
            # Clear CUDA cache
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        
        return {"status": "shutdown"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Shutdown failed: {str(e)}")


@app.get("/health")
async def health():
    """Health check."""
    return {
        "status": "healthy",
        "engine": "vllm",
        "initialized": llm is not None,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind to")
    args = parser.parse_args()
    
    print(f"Starting vLLM server on {args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port)
