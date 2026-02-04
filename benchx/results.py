"""Benchmark results handling and reporting."""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import json
from pathlib import Path


@dataclass
class RunResult:
    """Result from a single benchmark run."""
    
    engine: str
    model: str
    workload: str
    metrics: Dict[str, Any]
    memory_usage: Dict[str, float]
    success: bool
    error: Optional[str] = None
    
    @classmethod
    def failed(cls, engine: str, model: str, workload: str, error: str):
        """Create failed result."""
        return cls(
            engine=engine,
            model=model,
            workload=workload,
            metrics={},
            memory_usage={},
            success=False,
            error=error,
        )


class BenchmarkResults:
    """Container for benchmark results with reporting capabilities."""
    
    def __init__(self, results: List[RunResult], config):
        self.results = results
        self.config = config
    
    def generate_report(self, format: str = "markdown", output_path: Optional[str] = None) -> str:
        """Generate benchmark report."""
        if format == "markdown":
            return self._generate_markdown()
        elif format == "html":
            return self._generate_html()
        elif format == "json":
            return self._generate_json()
        else:
            raise ValueError(f"Unknown format: {format}")
    
    def recommend_engine(self, priority: str = "cost") -> Dict[str, Any]:
        """Recommend best engine based on priority."""
        if priority == "cost":
            return self._recommend_by_cost()
        elif priority == "latency":
            return self._recommend_by_latency()
        elif priority == "throughput":
            return self._recommend_by_throughput()
        else:
            raise ValueError(f"Unknown priority: {priority}")
    
    def _generate_markdown(self) -> str:
        """Generate markdown report."""
        lines = ["# BenchX Results\n"]
        
        for result in self.results:
            if not result.success:
                lines.append(f"## ❌ {result.engine} - {result.model} - {result.workload}")
                lines.append(f"Error: {result.error}\n")
                continue
            
            lines.append(f"## {result.engine} - {result.model} - {result.workload}\n")
            lines.append("### Metrics")
            for key, value in result.metrics.items():
                lines.append(f"- **{key}**: {value:.4f}")
            
            lines.append("\n### Memory Usage")
            for key, value in result.memory_usage.items():
                lines.append(f"- **{key}**: {value:.2f} GB")
            lines.append("")
        
        report = "\n".join(lines)
        
        if self.config.output_dir:
            output_path = Path(self.config.output_dir) / "report.md"
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(report)
            print(f"\n📊 Report saved to: {output_path}")
        
        return report
    
    def _generate_html(self) -> str:
        """Generate HTML report."""
        # Simplified HTML generation
        html = "<html><body><h1>BenchX Results</h1>"
        for result in self.results:
            html += f"<h2>{result.engine} - {result.model}</h2>"
            html += f"<pre>{json.dumps(result.metrics, indent=2)}</pre>"
        html += "</body></html>"
        return html
    
    def _generate_json(self) -> str:
        """Generate JSON report."""
        data = []
        for result in self.results:
            data.append({
                "engine": result.engine,
                "model": result.model,
                "workload": result.workload,
                "metrics": result.metrics,
                "memory_usage": result.memory_usage,
                "success": result.success,
            })
        return json.dumps(data, indent=2)
    
    def _recommend_by_cost(self) -> Dict[str, Any]:
        """Recommend engine with lowest cost."""
        best = min(
            [r for r in self.results if r.success],
            key=lambda r: r.metrics.get("cost_per_1m_tokens", float("inf")),
            default=None,
        )
        if best:
            return {"engine": best.engine, "reason": "Lowest cost per 1M tokens"}
        return {"engine": None, "reason": "No successful runs"}
    
    def _recommend_by_latency(self) -> Dict[str, Any]:
        """Recommend engine with lowest latency."""
        best = min(
            [r for r in self.results if r.success],
            key=lambda r: r.metrics.get("ttft_mean", float("inf")),
            default=None,
        )
        if best:
            return {"engine": best.engine, "reason": "Lowest TTFT"}
        return {"engine": None, "reason": "No successful runs"}
    
    def _recommend_by_throughput(self) -> Dict[str, Any]:
        """Recommend engine with highest throughput."""
        best = max(
            [r for r in self.results if r.success],
            key=lambda r: r.metrics.get("throughput", 0),
            default=None,
        )
        if best:
            return {"engine": best.engine, "reason": "Highest throughput"}
        return {"engine": None, "reason": "No successful runs"}
