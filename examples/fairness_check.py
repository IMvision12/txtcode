"""Example: Config fairness checking."""

from benchx.fairness import FairnessChecker

# Define configs for different engines
configs = {
    "vllm": {
        "model": "meta-llama/Meta-Llama-3-8B",
        "tensor_parallel_size": 4,
        "max_tokens": 2048,
        "dtype": "float16",
        "gpu_memory_utilization": 0.9,
    },
    "sglang": {
        "model": "meta-llama/Meta-Llama-3-8B",
        "tp_size": 2,  # Mismatch!
        "max_tokens": 2048,
        "dtype": "float16",
        "mem_fraction_static": 0.85,  # Different param name
    },
}

# Check for mismatches
checker = FairnessChecker()
mismatches = checker.check_configs(configs)

print("🔍 Config Fairness Check\n")
if mismatches:
    print("Found configuration mismatches:")
    for mismatch in mismatches:
        print(f"  {mismatch}")
    
    # Auto-fix configs
    print("\n🔧 Auto-fixing configs...")
    fixed_configs = checker.auto_fix_configs(configs)
    
    print("\nFixed configs:")
    for engine, config in fixed_configs.items():
        print(f"  {engine}: {config}")
else:
    print("✅ All configs are fair!")
