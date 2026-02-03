from typing import Optional, Literal
from pydantic import BaseModel, Field


class EngineConfig(BaseModel):
    name: Literal["vllm", "sglang", "tgi", "tensorrt", "exllama", "llamacpp", "auto"] = "auto"
    tensor_parallel: int = Field(default=1, ge=1)
    max_batch_size: int = Field(default=32, ge=1)
    max_seq_length: int = Field(default=2048, ge=1)
    gpu_memory_utilization: float = Field(default=0.9, ge=0.1, le=1.0)
    trust_remote_code: bool = Field(default=False)
    dtype: Literal["auto", "float16", "bfloat16", "float32"] = "auto"
    
    class Config:
        extra = "allow"


class QuantizationConfig(BaseModel):
    method: Literal["none", "4bit", "8bit", "awq", "gptq", "gguf", "auto"] = "none"
    bits: int = Field(default=4, ge=2, le=8)
    group_size: int = Field(default=128)
    desc_act: bool = Field(default=False)
    sym: bool = Field(default=True)
    
    class Config:
        extra = "allow"


class ServerConfig(BaseModel):
    host: str = "0.0.0.0"
    port: int = Field(default=8000, ge=1024, le=65535)
    api_key: Optional[str] = None
    cors_enabled: bool = True
    log_level: Literal["debug", "info", "warning", "error"] = "info"
    timeout: int = Field(default=300, ge=1)


class ModelConfig(BaseModel):
    model_id: str = Field(...)
    revision: Optional[str] = Field(default=None)
    cache_dir: Optional[str] = Field(default=None)
    local_files_only: bool = Field(default=False)
    token: Optional[str] = Field(default=None)
