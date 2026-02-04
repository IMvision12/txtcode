"""Cost modeling and cloud pricing integration."""

from typing import Dict, Optional
from dataclasses import dataclass


@dataclass
class PricingInfo:
    """Cloud pricing information."""
    
    provider: str
    instance_type: str
    hourly_rate: float
    gpu_count: int
    gpu_type: str


class CostCalculator:
    """Calculate inference costs."""
    
    # Pricing data ($/hour) - as of 2024
    CLOUD_PRICING = {
        "aws": {
            "p5.48xlarge": {"rate": 98.32, "gpus": 8, "type": "H100"},
            "p4d.24xlarge": {"rate": 32.77, "gpus": 8, "type": "A100"},
            "g5.xlarge": {"rate": 1.006, "gpus": 1, "type": "A10"},
        },
        "gcp": {
            "a2-highgpu-8g": {"rate": 12.00, "gpus": 8, "type": "A100"},
            "g2-standard-4": {"rate": 1.35, "gpus": 1, "type": "L4"},
        },
        "azure": {
            "Standard_ND96asr_v4": {"rate": 27.20, "gpus": 8, "type": "A100"},
        },
    }
    
    @staticmethod
    def calculate_cost_per_1m_tokens(
        throughput_tokens_per_sec: float,
        hourly_rate: float,
        gpu_count: int = 1
    ) -> float:
        """Calculate cost per 1M tokens."""
        if throughput_tokens_per_sec <= 0:
            return float("inf")
        
        # Tokens per hour
        tokens_per_hour = throughput_tokens_per_sec * 3600
        
        # Cost per 1M tokens
        cost_per_1m = (hourly_rate / tokens_per_hour) * 1_000_000
        
        return cost_per_1m
    
    @staticmethod
    def get_pricing(
        provider: str,
        instance_type: str
    ) -> Optional[PricingInfo]:
        """Get pricing info for cloud instance."""
        provider_pricing = CostCalculator.CLOUD_PRICING.get(provider.lower())
        if not provider_pricing:
            return None
        
        instance_info = provider_pricing.get(instance_type)
        if not instance_info:
            return None
        
        return PricingInfo(
            provider=provider,
            instance_type=instance_type,
            hourly_rate=instance_info["rate"],
            gpu_count=instance_info["gpus"],
            gpu_type=instance_info["type"],
        )
    
    @staticmethod
    def compare_costs(
        results: Dict[str, Dict[str, float]],
        provider: str = "aws",
        instance_type: str = "p5.48xlarge"
    ) -> Dict[str, float]:
        """Compare costs across engines."""
        pricing = CostCalculator.get_pricing(provider, instance_type)
        if not pricing:
            return {}
        
        costs = {}
        for engine, metrics in results.items():
            throughput = metrics.get("throughput", 0)
            cost = CostCalculator.calculate_cost_per_1m_tokens(
                throughput,
                pricing.hourly_rate,
                pricing.gpu_count
            )
            costs[engine] = cost
        
        return costs
