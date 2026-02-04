"""Benchmark results handling and reporting."""

from typing import Dict, Any, Optional
import json
from pathlib import Path


class BenchmarkResults:
    """Container for benchmark results with reporting capabilities."""
    
    def __init__(self, results: Dict[str, Dict[str, Any]], prompts: list, max_tokens: int):
        """Initialize results.
        
        Args:
            results: Dict mapping engine name to metrics dict
            prompts: List of prompts used
            max_tokens: Max tokens per generation
        """
        self.results = results
        self.prompts = prompts
        self.max_tokens = max_tokens
    
    def print_summary(self):
        """Print formatted summary to console."""
        print(f"\n{'='*80}")
        print(f"Benchmark Results Summary")
        print(f"{'='*80}")
        print(f"Prompts: {len(self.prompts)} | Max Tokens: {self.max_tokens}\n")
        
        # Table header
        print(f"{'Engine':<15} {'Throughput':<15} {'Avg Latency':<15} {'TTFT':<12} {'Memory':<12}")
        print(f"{'':<15} {'(tokens/sec)':<15} {'(sec)':<15} {'(ms)':<12} {'(GB)':<12}")
        print("-" * 80)
        
        # Table rows
        for engine_name, metrics in self.results.items():
            if not metrics.get("success", False):
                print(f"{engine_name:<15} {'FAILED':<15} {'-':<15} {'-':<12} {'-':<12}")
                continue
            
            throughput = metrics.get("throughput_tokens_per_sec", 0)
            avg_latency = metrics.get("avg_latency", 0)
            avg_ttft = metrics.get("avg_ttft", 0) * 1000  # Convert to ms
            memory = metrics.get("memory_usage", {}).get("total_allocated_gb", 0)
            
            print(f"{engine_name:<15} {throughput:>14,.0f} {avg_latency:>14.3f} {avg_ttft:>11.1f} {memory:>11.2f}")
        
        print(f"{'='*80}\n")
        
        # Winner
        successful = {k: v for k, v in self.results.items() if v.get("success", False)}
        if successful:
            best_throughput = max(successful.items(), key=lambda x: x[1].get("throughput_tokens_per_sec", 0))
            best_latency = min(successful.items(), key=lambda x: x[1].get("avg_latency", float("inf")))
            print(f"🏆 Best Throughput: {best_throughput[0]} ({best_throughput[1]['throughput_tokens_per_sec']:.0f} tokens/sec)")
            print(f"⚡ Best Latency: {best_latency[0]} ({best_latency[1]['avg_latency']:.3f}s)\n")
    
    def save_report(self, output_path: str, format: str = "json"):
        """Save report to file.
        
        Args:
            output_path: Path to save report
            format: Report format (json, markdown, csv)
        """
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        
        if format == "json":
            content = self._generate_json()
        elif format == "markdown":
            content = self._generate_markdown()
        elif format == "csv":
            content = self._generate_csv()
        else:
            raise ValueError(f"Unknown format: {format}")
        
        path.write_text(content)
        print(f"📊 Report saved to: {output_path}")
    
    def plot_throughput(self, output_path: Optional[str] = None):
        """Plot throughput comparison."""
        try:
            import matplotlib.pyplot as plt
            
            engines = []
            throughputs = []
            
            for engine_name, metrics in self.results.items():
                if metrics.get("success", False):
                    engines.append(engine_name)
                    throughputs.append(metrics.get("throughput_tokens_per_sec", 0))
            
            plt.figure(figsize=(10, 6))
            plt.bar(engines, throughputs)
            plt.xlabel("Engine")
            plt.ylabel("Throughput (tokens/sec)")
            plt.title("Throughput Comparison")
            plt.tight_layout()
            
            if output_path:
                plt.savefig(output_path)
                print(f"📈 Plot saved to: {output_path}")
            else:
                plt.show()
        except ImportError:
            print("⚠️  matplotlib not installed. Install with: pip install matplotlib")
    
    def plot_latency(self, output_path: Optional[str] = None):
        """Plot latency comparison."""
        try:
            import matplotlib.pyplot as plt
            
            engines = []
            latencies = []
            
            for engine_name, metrics in self.results.items():
                if metrics.get("success", False):
                    engines.append(engine_name)
                    latencies.append(metrics.get("avg_latency", 0))
            
            plt.figure(figsize=(10, 6))
            plt.bar(engines, latencies)
            plt.xlabel("Engine")
            plt.ylabel("Average Latency (sec)")
            plt.title("Latency Comparison")
            plt.tight_layout()
            
            if output_path:
                plt.savefig(output_path)
                print(f"📈 Plot saved to: {output_path}")
            else:
                plt.show()
        except ImportError:
            print("⚠️  matplotlib not installed. Install with: pip install matplotlib")
    
    def plot_memory(self, output_path: Optional[str] = None):
        """Plot memory usage comparison."""
        try:
            import matplotlib.pyplot as plt
            
            engines = []
            memory = []
            
            for engine_name, metrics in self.results.items():
                if metrics.get("success", False):
                    engines.append(engine_name)
                    memory.append(metrics.get("memory_usage", {}).get("total_allocated_gb", 0))
            
            plt.figure(figsize=(10, 6))
            plt.bar(engines, memory)
            plt.xlabel("Engine")
            plt.ylabel("Memory Usage (GB)")
            plt.title("Memory Usage Comparison")
            plt.tight_layout()
            
            if output_path:
                plt.savefig(output_path)
                print(f"📈 Plot saved to: {output_path}")
            else:
                plt.show()
        except ImportError:
            print("⚠️  matplotlib not installed. Install with: pip install matplotlib")
    
    def _generate_json(self) -> str:
        """Generate JSON report."""
        data = {
            "prompts": len(self.prompts),
            "max_tokens": self.max_tokens,
            "results": self.results,
        }
        return json.dumps(data, indent=2)
    
    def _generate_markdown(self) -> str:
        """Generate markdown report."""
        lines = ["# BenchX Results\n"]
        lines.append(f"**Prompts**: {len(self.prompts)} | **Max Tokens**: {self.max_tokens}\n")
        
        for engine_name, metrics in self.results.items():
            lines.append(f"## {engine_name}\n")
            
            if not metrics.get("success", False):
                lines.append(f"❌ **Status**: Failed")
                lines.append(f"**Error**: {metrics.get('error', 'Unknown error')}\n")
                continue
            
            lines.append(f"✅ **Status**: Success\n")
            lines.append("### Metrics\n")
            lines.append(f"- **Throughput**: {metrics.get('throughput_tokens_per_sec', 0):.2f} tokens/sec")
            lines.append(f"- **Avg Latency**: {metrics.get('avg_latency', 0):.3f}s")
            lines.append(f"- **P50 Latency**: {metrics.get('p50_latency', 0):.3f}s")
            lines.append(f"- **P95 Latency**: {metrics.get('p95_latency', 0):.3f}s")
            lines.append(f"- **P99 Latency**: {metrics.get('p99_latency', 0):.3f}s")
            
            if metrics.get("avg_ttft", 0) > 0:
                lines.append(f"- **Avg TTFT**: {metrics.get('avg_ttft', 0)*1000:.1f}ms")
            
            lines.append(f"- **Total Requests**: {metrics.get('total_requests', 0)}")
            lines.append(f"- **Successful**: {metrics.get('successful_requests', 0)}")
            lines.append(f"- **Failed**: {metrics.get('failed_requests', 0)}")
            
            memory = metrics.get("memory_usage", {})
            if memory.get("total_allocated_gb"):
                lines.append(f"\n### Memory Usage\n")
                lines.append(f"- **Total Allocated**: {memory.get('total_allocated_gb', 0):.2f} GB")
                if memory.get("peak_allocated_gb"):
                    lines.append(f"- **Peak Allocated**: {memory.get('peak_allocated_gb', 0):.2f} GB")
            
            lines.append("")
        
        return "\n".join(lines)
    
    def _generate_csv(self) -> str:
        """Generate CSV report."""
        lines = ["engine,throughput_tokens_per_sec,avg_latency,p50_latency,p95_latency,p99_latency,avg_ttft_ms,memory_gb,success"]
        
        for engine_name, metrics in self.results.items():
            if not metrics.get("success", False):
                lines.append(f"{engine_name},0,0,0,0,0,0,0,False")
                continue
            
            throughput = metrics.get("throughput_tokens_per_sec", 0)
            avg_latency = metrics.get("avg_latency", 0)
            p50 = metrics.get("p50_latency", 0)
            p95 = metrics.get("p95_latency", 0)
            p99 = metrics.get("p99_latency", 0)
            ttft = metrics.get("avg_ttft", 0) * 1000
            memory = metrics.get("memory_usage", {}).get("total_allocated_gb", 0)
            
            lines.append(f"{engine_name},{throughput:.2f},{avg_latency:.3f},{p50:.3f},{p95:.3f},{p99:.3f},{ttft:.1f},{memory:.2f},True")
        
        return "\n".join(lines)
