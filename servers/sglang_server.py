"""FastAPI server for SGLang engine."""

import argparse
import time
from typing import Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import torch

app = FastAPI(title="SGLang Server")

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
    quantization: str = None
    trust_remote_code: bool = False
    engine_kwargs: Dict[str, Any] = {}


@app.post("/initialize")
async def initialize(request: InitializeRequest):
    """Initialize SGLang engine."""
    global llm, config
    
    try:
        import sglang as sgl
        
        config = request
        
        # Build SGLang kwargs
        sglang_kwargs = {
            "model_path": request.model,
            "tp_size": request.tensor_parallel_size,
            "mem_fraction_static": request.gpu_memory_utilization,
            "trust_remote_code": request.trust_remote_code,
        }
        
        if request.quantization:
            sglang_kwargs["quantization"] = request.quantization
        
        # Add custom engine kwargs
        sglang_kwargs.update(request.engine_kwargs)
        
        llm = sgl.Engine(**sglang_kwargs)
        
        return {"status": "initialized", "model": request.model}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Initialization failed: {str(e)}")


@app.post("/generate")
async def generate(request: GenerateRequest):
    """Generate text using SGLang."""
    global llm
    
    if llm is None:
        raise HTTPException(status_code=400, detail="Engine not initialized")
    
    try:
        # Create sampling params
        sampling_params = {
            "max_new_tokens": request.max_tokens,
            "temperature": request.temperature,
            "top_p": request.top_p,
            "top_k": request.top_k,
        }
        
        # Generate
        start_time = time.perf_counter()
        output = llm.generate(request.prompt, sampling_params)
        end_time = time.perf_counter()
        
        generated_text = output["text"]
        
        # Calculate tokens (approximate if not provided)
        tokens_generated = output.get("tokens_generated", len(generated_text.split()))
        
        # Calculate metrics
        total_time = end_time - start_time
        ttft = output.get("time_to_first_token")
        
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
            llm.shutdown()
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
        "engine": "sglang",
        "initialized": llm is not None,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8001, help="Port to bind to")
    args = parser.parse_args()
    
    print(f"Starting SGLang server on {args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port)
