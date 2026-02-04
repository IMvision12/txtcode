"""Metrics collection and calculation."""

from typing import Dict, Any, List, Optional
import statistics
import time


class MetricsCollector:
    """Collects and aggregates benchmark metrics."""
    
    def __init__(self, metric_names: List[str]):
        self.metric_names = metric_names
        self.raw_data = []
        self.iteration_data = []
        self.ttft_data = []  # Separate TTFT tracking
        self.request_count = 0
        self.error_count = 0
    
    def record(self, result: Dict[str, Any], concurrency: int) -> None:
        """Record single generation result."""
        self.request_count += 1
        
        if result.get("error"):
            self.error_count += 1
            return
        
        # Record detailed metrics
        data_point = {
            "concurrency": concurrency,
            "total_time": result.get("total_time", 0),
            "tokens_generated": result.get("tokens_generated", 0),
            "ttft": result.get("ttft", 0),  # Time to first token
            "timestamp": time.time(),
        }
        
        # Add token-level timing if available
        if "token_timestamps" in result:
            data_point["token_timestamps"] = result["token_timestamps"]
        
        self.raw_data.append(data_point)
        
        # Track TTFT separately for better analysis
        if result.get("ttft", 0) > 0:
            self.ttft_data.append({
                "ttft": result["ttft"],
                "concurrency": concurrency,
            })
    
    def record_iteration(self, concurrency: int, elapsed: float, requests: int = 0) -> None:
        """Record iteration-level metrics."""
        self.iteration_data.append({
            "concurrency": concurrency,
            "elapsed": elapsed,
            "requests": requests or concurrency,
            "timestamp": time.time(),
        })
    
    def aggregate(self) -> Dict[str, Any]:
        """Calculate aggregate metrics."""
        if not self.raw_data:
            return self._empty_metrics()
        
        metrics = {
            "total_requests": self.request_count,
            "successful_requests": len(self.raw_data),
            "failed_requests": self.error_count,
            "success_rate": len(self.raw_data) / self.request_count if self.request_count > 0 else 0,
        }
        
        # Time to First Token (TTFT)
        if "ttft" in self.metric_names and self.ttft_data:
            ttft_values = [d["ttft"] for d in self.ttft_data if d["ttft"] > 0]
            if ttft_values:
                metrics["ttft_mean"] = statistics.mean(ttft_values)
                metrics["ttft_median"] = statistics.median(ttft_values)
                metrics["ttft_p50"] = self._percentile(ttft_values, 50)
                metrics["ttft_p95"] = self._percentile(ttft_values, 95)
                metrics["ttft_p99"] = self._percentile(ttft_values, 99)
                metrics["ttft_min"] = min(ttft_values)
                metrics["ttft_max"] = max(ttft_values)
        
        # Time Per Output Token (TPOT)
        if "tpot" in self.metric_names:
            tpots = []
            for d in self.raw_data:
                if d["tokens_generated"] > 0 and d["total_time"] > 0:
                    # TPOT = (total_time - ttft) / tokens_generated
                    generation_time = d["total_time"] - d.get("ttft", 0)
                    if generation_time > 0:
                        tpot = generation_time / d["tokens_generated"]
                        tpots.append(tpot)
            
            if tpots:
                metrics["tpot_mean"] = statistics.mean(tpots)
                metrics["tpot_median"] = statistics.median(tpots)
                metrics["tpot_p50"] = self._percentile(tpots, 50)
                metrics["tpot_p95"] = self._percentile(tpots, 95)
                metrics["tpot_p99"] = self._percentile(tpots, 99)
        
        # Throughput (tokens/second)
        if "throughput" in self.metric_names:
            total_tokens = sum(d["tokens_generated"] for d in self.raw_data)
            total_time = sum(d["elapsed"] for d in self.iteration_data)
            
            if total_time > 0:
                metrics["throughput_tokens_per_sec"] = total_tokens / total_time
                metrics["throughput_requests_per_sec"] = len(self.raw_data) / total_time
            
            # Per-concurrency throughput
            concurrency_throughput = {}
            for concurrency in set(d["concurrency"] for d in self.raw_data):
                conc_data = [d for d in self.raw_data if d["concurrency"] == concurrency]
                conc_iterations = [d for d in self.iteration_data if d["concurrency"] == concurrency]
                
                if conc_iterations:
                    conc_tokens = sum(d["tokens_generated"] for d in conc_data)
                    conc_time = sum(d["elapsed"] for d in conc_iterations)
                    if conc_time > 0:
                        concurrency_throughput[f"throughput_c{concurrency}"] = conc_tokens / conc_time
            
            metrics.update(concurrency_throughput)
        
        # Latency percentiles
        if "p99_latency" in self.metric_names or "latency" in self.metric_names:
            latencies = [d["total_time"] for d in self.raw_data]
            if latencies:
                metrics["latency_mean"] = statistics.mean(latencies)
                metrics["latency_median"] = statistics.median(latencies)
                metrics["latency_p50"] = self._percentile(latencies, 50)
                metrics["latency_p95"] = self._percentile(latencies, 95)
                metrics["latency_p99"] = self._percentile(latencies, 99)
                metrics["latency_min"] = min(latencies)
                metrics["latency_max"] = max(latencies)
        
        # Token statistics
        tokens_list = [d["tokens_generated"] for d in self.raw_data if d["tokens_generated"] > 0]
        if tokens_list:
            metrics["tokens_mean"] = statistics.mean(tokens_list)
            metrics["tokens_total"] = sum(tokens_list)
        
        return metrics
    
    def _empty_metrics(self) -> Dict[str, Any]:
        """Return empty metrics structure."""
        return {
            "total_requests": self.request_count,
            "successful_requests": 0,
            "failed_requests": self.error_count,
            "success_rate": 0.0,
        }
    
    @staticmethod
    def _percentile(data: List[float], percentile: int) -> float:
        """Calculate percentile using nearest-rank method."""
        if not data:
            return 0.0
        sorted_data = sorted(data)
        if percentile == 100:
            return sorted_data[-1]
        index = max(0, int(len(sorted_data) * percentile / 100) - 1)
        return sorted_data[min(index, len(sorted_data) - 1)]
    
    def get_summary(self) -> str:
        """Get human-readable summary."""
        metrics = self.aggregate()
        lines = [
            f"Requests: {metrics.get('successful_requests', 0)}/{metrics.get('total_requests', 0)}",
            f"Success Rate: {metrics.get('success_rate', 0):.1%}",
        ]
        
        if "throughput_tokens_per_sec" in metrics:
            lines.append(f"Throughput: {metrics['throughput_tokens_per_sec']:.2f} tok/s")
        
        if "ttft_mean" in metrics:
            lines.append(f"TTFT: {metrics['ttft_mean']*1000:.2f}ms (p99: {metrics.get('ttft_p99', 0)*1000:.2f}ms)")
        
        if "tpot_mean" in metrics:
            lines.append(f"TPOT: {metrics['tpot_mean']*1000:.2f}ms")
        
        return " | ".join(lines)
