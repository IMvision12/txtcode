"""Cost modeling and cloud pricing integration."""

from typing import Dict, Optional
from dataclasses import dataclass
import httpx
import json
from datetime import datetime, timedelta


@dataclass
class PricingInfo:
    """Cloud pricing information."""
    
    provider: str
    instance_type: str
    hourly_rate: float
    gpu_count: int
    gpu_type: str


class CostCalculator:
    """Calculate inference costs with real-time pricing."""
    
    # Fallback pricing data ($/hour) - used if API fetch fails
    FALLBACK_PRICING = {
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
    
    # Cache for pricing data
    _pricing_cache: Dict[str, Dict] = {}
    _cache_timestamp: Optional[datetime] = None
    _cache_duration = timedelta(hours=24)  # Cache for 24 hours
    
    @staticmethod
    def _fetch_aws_pricing(instance_type: str, region: str = "us-east-1") -> Optional[float]:
        """Fetch real-time AWS pricing using AWS Price List API."""
        try:
            # AWS Pricing API - using the bulk API endpoint
            # Map region codes to region names
            region_map = {
                "us-east-1": "US East (N. Virginia)",
                "us-west-2": "US West (Oregon)",
                "eu-west-1": "EU (Ireland)",
                "ap-southeast-1": "Asia Pacific (Singapore)",
            }
            
            region_name = region_map.get(region, "US East (N. Virginia)")
            
            # Use AWS Pricing API endpoint
            url = f"https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/{region}/index.json"
            
            with httpx.Client(timeout=30.0) as client:
                response = client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    
                    # Search for the instance type in the pricing data
                    for sku, product in data.get("products", {}).items():
                        attributes = product.get("attributes", {})
                        if attributes.get("instanceType") == instance_type:
                            # Get the pricing terms
                            terms = data.get("terms", {}).get("OnDemand", {}).get(sku, {})
                            for term_key, term_data in terms.items():
                                price_dimensions = term_data.get("priceDimensions", {})
                                for price_key, price_data in price_dimensions.items():
                                    price_per_unit = price_data.get("pricePerUnit", {}).get("USD")
                                    if price_per_unit:
                                        return float(price_per_unit)
            
            return None
            
        except Exception as e:
            print(f"Error fetching AWS pricing: {e}")
            return None
    
    @staticmethod
    def _fetch_gcp_pricing(instance_type: str, region: str = "us-central1") -> Optional[float]:
        """Fetch real-time GCP pricing using Cloud Billing API."""
        try:
            # GCP Cloud Billing Catalog API
            # Service ID for Compute Engine: 6F81-5844-456A
            service_id = "6F81-5844-456A"
            url = f"https://cloudbilling.googleapis.com/v1/services/{service_id}/skus"
            
            # Map instance types to GCP machine types
            machine_type_map = {
                "a2-highgpu-8g": "A2 Instance Core",
                "g2-standard-4": "G2 Instance Core",
            }
            
            machine_type = machine_type_map.get(instance_type)
            if not machine_type:
                return None
            
            with httpx.Client(timeout=30.0) as client:
                response = client.get(url, params={"key": ""})  # Add API key if available
                
                if response.status_code == 200:
                    data = response.json()
                    
                    for sku in data.get("skus", []):
                        description = sku.get("description", "")
                        if machine_type in description and region in sku.get("serviceRegions", []):
                            pricing_info = sku.get("pricingInfo", [])
                            if pricing_info:
                                pricing_expression = pricing_info[0].get("pricingExpression", {})
                                tiered_rates = pricing_expression.get("tieredRates", [])
                                if tiered_rates:
                                    # Get the unit price (in nanos)
                                    unit_price_nanos = tiered_rates[0].get("unitPrice", {}).get("nanos", 0)
                                    # Convert from nanos to dollars per hour
                                    hourly_rate = (unit_price_nanos / 1_000_000_000)
                                    return hourly_rate
            
            return None
            
        except Exception as e:
            print(f"Error fetching GCP pricing: {e}")
            return None
    
    @staticmethod
    def _should_refresh_cache() -> bool:
        """Check if pricing cache should be refreshed."""
        if CostCalculator._cache_timestamp is None:
            return True
        return datetime.now() - CostCalculator._cache_timestamp > CostCalculator._cache_duration
    
    @staticmethod
    def clear_cache() -> None:
        """Clear the pricing cache to force fresh data fetch."""
        CostCalculator._pricing_cache.clear()
        CostCalculator._cache_timestamp = None
    
    @staticmethod
    def fetch_realtime_pricing(
        provider: str,
        instance_type: str,
        region: str = "us-east-1"
    ) -> Optional[Dict]:
        """Fetch real-time pricing from cloud providers."""
        cache_key = f"{provider}_{instance_type}_{region}"
        
        # Check cache first
        if not CostCalculator._should_refresh_cache() and cache_key in CostCalculator._pricing_cache:
            return CostCalculator._pricing_cache[cache_key]
        
        pricing_data = None
        
        if provider.lower() == "aws":
            rate = CostCalculator._fetch_aws_pricing(instance_type, region)
            if rate:
                # Get GPU info from fallback data
                fallback = CostCalculator.FALLBACK_PRICING.get("aws", {}).get(instance_type, {})
                pricing_data = {
                    "rate": rate,
                    "gpus": fallback.get("gpus", 1),
                    "type": fallback.get("type", "Unknown"),
                    "source": "realtime"
                }
        
        elif provider.lower() == "gcp":
            rate = CostCalculator._fetch_gcp_pricing(instance_type, region)
            if rate:
                # Get GPU info from fallback data
                fallback = CostCalculator.FALLBACK_PRICING.get("gcp", {}).get(instance_type, {})
                pricing_data = {
                    "rate": rate,
                    "gpus": fallback.get("gpus", 1),
                    "type": fallback.get("type", "Unknown"),
                    "source": "realtime"
                }
        
        # If real-time fetch failed, use fallback
        if pricing_data is None:
            fallback = CostCalculator.FALLBACK_PRICING.get(provider.lower(), {}).get(instance_type)
            if fallback:
                pricing_data = {**fallback, "source": "fallback"}
        
        # Update cache
        if pricing_data:
            CostCalculator._pricing_cache[cache_key] = pricing_data
            CostCalculator._cache_timestamp = datetime.now()
        
        return pricing_data
    
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
        instance_type: str,
        region: str = "us-east-1",
        use_realtime: bool = True
    ) -> Optional[PricingInfo]:
        """Get pricing info for cloud instance.
        
        Args:
            provider: Cloud provider (aws, gcp, azure)
            instance_type: Instance type name
            region: Cloud region
            use_realtime: Whether to fetch real-time pricing (default: True)
        """
        if use_realtime and provider.lower() in ["aws", "gcp"]:
            instance_info = CostCalculator.fetch_realtime_pricing(provider, instance_type, region)
        else:
            # Use fallback pricing
            provider_pricing = CostCalculator.FALLBACK_PRICING.get(provider.lower())
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
        instance_type: str = "p5.48xlarge",
        region: str = "us-east-1",
        use_realtime: bool = True
    ) -> Dict[str, float]:
        """Compare costs across engines.
        
        Args:
            results: Benchmark results with throughput metrics
            provider: Cloud provider
            instance_type: Instance type
            region: Cloud region
            use_realtime: Whether to use real-time pricing
        """
        pricing = CostCalculator.get_pricing(provider, instance_type, region, use_realtime)
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
