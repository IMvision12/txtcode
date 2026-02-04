"""Advanced benchmark with all features."""

from benchx import InferenceBenchmark, Workload

# Comprehensive test matrix
benchmark = InferenceBenchmark(
    engines=["vllm", "sglang", "tensorrt"],
    models=[
        "meta-llama/Meta-Llama-3-8B",
        "deepseek-ai/DeepSeek-R1-Distill-Qwen-14B",
    ],
    hardware=["H100", "A100"],
    workloads=[
        Workload.chat(
            concurrency=[1, 10, 50, 100],
            context_lengths=[2048, 8192, 32768]
        ),
        Workload.rag(
            document_count=1000,
            query_patterns=["hot", "cold"]
        ),
        Workload.structured_generation(
            json_schema="complex_schema.json"
        ),
        Workload.tool_calling(
            parallel_tools=5
        ),
    ],
    metrics=[
        "ttft",
        "tpot",
        "throughput",
        "gpu_memory",
        "cost_per_1m_tokens",
        "p99_latency"
    ],
    fairness_check=True,
)

# Run benchmark
results = benchmark.run()

# Generate all report formats
results.generate_report(format="markdown")
results.generate_report(format="html")
results.generate_report(format="json")

# Get recommendations for different priorities
print("\n📊 Recommendations:")
for priority in ["cost", "latency", "throughput"]:
    rec = results.recommend_engine(priority=priority)
    print(f"  {priority.capitalize()}: {rec['engine']} - {rec['reason']}")
