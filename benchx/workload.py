"""Workload definitions for realistic inference scenarios."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class WorkloadConfig(BaseModel):
    """Base configuration for workloads."""
    
    name: str
    workload_type: str
    concurrency: List[int] = Field(default=[1])
    duration_seconds: int = Field(default=60)
    warmup_seconds: int = Field(default=10)
    params: Dict[str, Any] = Field(default_factory=dict)


class Workload:
    """Factory for creating workload configurations."""
    
    @staticmethod
    def chat(
        concurrency: List[int] = [1, 10, 50],
        context_lengths: List[int] = [2048, 8192],
        duration_seconds: int = 60
    ) -> WorkloadConfig:
        """Chat workload with varying concurrency and context lengths."""
        return WorkloadConfig(
            name="chat",
            workload_type="chat",
            concurrency=concurrency,
            duration_seconds=duration_seconds,
            params={
                "context_lengths": context_lengths,
                "output_tokens": 256,
                "temperature": 0.7,
            }
        )
    
    @staticmethod
    def rag(
        document_count: int = 1000,
        query_patterns: List[str] = ["hot", "cold"],
        concurrency: List[int] = [10, 50],
        duration_seconds: int = 120
    ) -> WorkloadConfig:
        """RAG workload simulating document retrieval patterns."""
        return WorkloadConfig(
            name="rag",
            workload_type="rag",
            concurrency=concurrency,
            duration_seconds=duration_seconds,
            params={
                "document_count": document_count,
                "query_patterns": query_patterns,
                "context_length": 4096,
                "output_tokens": 512,
            }
        )
    
    @staticmethod
    def structured_generation(
        json_schema: Optional[str] = None,
        concurrency: List[int] = [1, 10],
        duration_seconds: int = 60
    ) -> WorkloadConfig:
        """Structured output generation with JSON schema."""
        return WorkloadConfig(
            name="structured_generation",
            workload_type="structured",
            concurrency=concurrency,
            duration_seconds=duration_seconds,
            params={
                "json_schema": json_schema or "default_schema.json",
                "output_tokens": 512,
            }
        )
    
    @staticmethod
    def tool_calling(
        parallel_tools: int = 5,
        concurrency: List[int] = [1, 10],
        duration_seconds: int = 60
    ) -> WorkloadConfig:
        """Tool/function calling workload."""
        return WorkloadConfig(
            name="tool_calling",
            workload_type="tool_calling",
            concurrency=concurrency,
            duration_seconds=duration_seconds,
            params={
                "parallel_tools": parallel_tools,
                "tool_complexity": "medium",
            }
        )
