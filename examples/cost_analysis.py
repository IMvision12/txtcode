"""Example: Cost analysis across engines."""

from benchx.cost import CostCalculator

# Simulated benchmark results
results = {
    "vllm": {"throughput": 1500},  # tokens/sec
    "sglang": {"throughput": 1800},
    "tensorrt": {"throughput": 2200},
}

# Calculate costs for AWS p5.48xlarge (8x H100)
print("💰 Cost Analysis - AWS p5.48xlarge (8x H100)\n")

pricing = CostCalculator.get_pricing("aws", "p5.48xlarge")
print(f"Instance: {pricing.instance_type}")
print(f"Rate: ${pricing.hourly_rate:.2f}/hour")
print(f"GPUs: {pricing.gpu_count}x {pricing.gpu_type}\n")

costs = CostCalculator.compare_costs(results, "aws", "p5.48xlarge")

print("Cost per 1M tokens:")
for engine, cost in sorted(costs.items(), key=lambda x: x[1]):
    throughput = results[engine]["throughput"]
    print(f"  {engine:12s}: ${cost:6.2f}  ({throughput} tok/s)")

# Find best value
best_engine = min(costs.items(), key=lambda x: x[1])
print(f"\n🏆 Best value: {best_engine[0]} at ${best_engine[1]:.2f} per 1M tokens")
