"""Basic benchmark example."""

from benchx import InferenceBenchmark, Workload

# Define test matrix
benchmark = InferenceBenchmark(
    engines=["vllm", "sglang"],
    models=["meta-llama/Meta-Llama-3-8B"],
    hardware=["H100"],
    workloads=[
        Workload.chat(concurrency=[1, 10, 50], context_lengths=[2048, 8192]),
        Workload.rag(document_count=1000, query_patterns=["hot", "cold"]),
    ],
    metrics=["ttft", "tpot", "throughput", "gpu_memory", "cost_per_1m_tokens", "p99_latency"]
)

# Run head-to-head comparison
results = benchmark.run()

# Generate reports
results.generate_report(format="markdown")
results.generate_report(format="json")

# Get recommendation
recommendation = results.recommend_engine(priority="cost")
print(f"\n🏆 Recommended engine: {recommendation['engine']}")
print(f"   Reason: {recommendation['reason']}")
