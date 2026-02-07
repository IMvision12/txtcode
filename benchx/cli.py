"""BenchX CLI - Docker-only LLM inference benchmarking.

Production-ready, reproducible benchmarking using Docker containers.
"""

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, Any, List
import requests


class BenchXCLI:
    """CLI for managing Docker-based benchmarks."""
    
    def __init__(self):
        self.package_dir = Path(__file__).parent
        self.docker_dir = self.package_dir / "docker"
        
        self.engines = {
            "vllm": {"port": 8000, "container": "benchx-vllm"},
            "sglang": {"port": 8001, "container": "benchx-sglang"},
            "tensorrt": {"port": 8002, "container": "benchx-tensorrt"},
        }
    
    def check_docker(self):
        """Check if Docker is installed and running."""
        try:
            result = subprocess.run(
                ["docker", "--version"],
                capture_output=True,
                text=True,
                check=True
            )
            print(f"✓ Docker found: {result.stdout.strip()}")
            
            subprocess.run(
                ["docker", "ps"],
                capture_output=True,
                text=True,
                check=True
            )
            print("✓ Docker daemon is running")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("✗ Docker is not installed or not running")
            print("\nPlease install Docker:")
            print("  - Windows/Mac: https://www.docker.com/products/docker-desktop")
            print("  - Linux: https://docs.docker.com/engine/install/")
            return False
    
    def check_docker_compose(self):
        """Check if Docker Compose is available."""
        try:
            result = subprocess.run(
                ["docker-compose", "--version"],
                capture_output=True,
                text=True,
                check=True
            )
            print(f"✓ Docker Compose found: {result.stdout.strip()}")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            try:
                result = subprocess.run(
                    ["docker", "compose", "version"],
                    capture_output=True,
                    text=True,
                    check=True
                )
                print(f"✓ Docker Compose found: {result.stdout.strip()}")
                return True
            except (subprocess.CalledProcessError, FileNotFoundError):
                print("✗ Docker Compose not found")
                return False
    
    def build_images(self, engines: List[str] = None):
        """Build Docker images for specified engines."""
        if not self.check_docker() or not self.check_docker_compose():
            return False
        
        if engines is None:
            engines = ["vllm", "sglang", "tensorrt"]
        
        print("\n" + "="*80)
        print("Building Docker Images")
        print("="*80)
        print(f"\nBuilding images for: {', '.join(engines)}\n")
        
        for i, engine in enumerate(engines, 1):
            print(f"[{i}/{len(engines)}] Building {engine} image...")
            
            try:
                subprocess.run(
                    ["docker", "compose", "build", engine],
                    cwd=self.docker_dir,
                    check=True
                )
            except (subprocess.CalledProcessError, FileNotFoundError):
                try:
                    subprocess.run(
                        ["docker-compose", "build", engine],
                        cwd=self.docker_dir,
                        check=True
                    )
                except subprocess.CalledProcessError as e:
                    print(f"  ✗ Failed to build {engine}: {e}")
                    return False
            
            print(f"  ✓ {engine} image built\n")
        
        print("="*80)
        print("Build Complete!")
        print("="*80)
        print("\nYou can now run benchmarks with:")
        print("  benchx run --config benchmark.json")
        return True
    
    def start_containers(self, engines: List[str] = None):
        """Start Docker containers."""
        if engines is None:
            engines = ["vllm", "sglang", "tensorrt"]
        
        print(f"\nStarting containers: {', '.join(engines)}...")
        
        try:
            subprocess.run(
                ["docker", "compose", "up", "-d"] + engines,
                cwd=self.docker_dir,
                check=True,
                capture_output=True
            )
        except (subprocess.CalledProcessError, FileNotFoundError):
            subprocess.run(
                ["docker-compose", "up", "-d"] + engines,
                cwd=self.docker_dir,
                check=True,
                capture_output=True
            )
        
        print("✓ Containers started")
        return True
    
    def stop_containers(self, engines: List[str] = None):
        """Stop Docker containers."""
        if engines is None:
            engines = ["vllm", "sglang", "tensorrt"]
        
        print(f"\nStopping containers: {', '.join(engines)}...")
        
        try:
            subprocess.run(
                ["docker", "compose", "stop"] + engines,
                cwd=self.docker_dir,
                check=True,
                capture_output=True
            )
        except (subprocess.CalledProcessError, FileNotFoundError):
            subprocess.run(
                ["docker-compose", "stop"] + engines,
                cwd=self.docker_dir,
                check=True,
                capture_output=True
            )
        
        print("✓ Containers stopped")
        return True
    
    def check_containers(self, engines: List[str] = None, timeout: int = 5):
        """Check which containers are running."""
        if engines is None:
            engines = list(self.engines.keys())
        
        print("\nServer Status:")
        print("-" * 40)
        
        statuses = {}
        for engine in engines:
            port = self.engines[engine]["port"]
            try:
                response = requests.get(f"http://localhost:{port}/health", timeout=timeout)
                if response.status_code == 200:
                    data = response.json()
                    status = "✓ Running"
                    if data.get("initialized"):
                        status += " (initialized)"
                else:
                    status = "✗ Not responding"
            except requests.exceptions.Timeout:
                status = "✗ Timeout"
            except requests.exceptions.ConnectionError:
                status = "✗ Not running"
            except Exception as e:
                status = f"✗ Error: {type(e).__name__}"
            
            statuses[engine] = status
            print(f"  {engine:12} {status}")
        
        print("-" * 40)
        return statuses
    
    def run_benchmark(self, config_path: str):
        """Run benchmark from config file."""
        config_file = Path(config_path)
        if not config_file.exists():
            print(f"✗ Config file not found: {config_path}")
            return
        
        with open(config_file) as f:
            config = json.load(f)
        
        engines = list(config.get("engines", {}).keys())
        global_model = config.get("model")
        
        print("="*80)
        print("BenchX - Docker Benchmark")
        print("="*80)
        print(f"\nEngines: {', '.join(engines)}")
        if global_model:
            print(f"Model: {global_model}")
        print(f"Prompts: {len(config.get('prompts', []))}")
        print(f"Max Tokens: {config.get('max_tokens', 256)}")
        print("="*80)
        
        # Check server status
        print("\nChecking servers...")
        statuses = self.check_containers(engines)
        
        all_running = all("Running" in status for status in statuses.values())
        
        if not all_running:
            print(f"\n⚠ Not all containers are running!")
            print("\nStart containers with:")
            for engine, status in statuses.items():
                if "Running" not in status:
                    print(f"  docker-compose up -d {engine}")
            
            response = input(f"\nStart containers automatically? (y/n): ")
            if response.lower() == 'y':
                try:
                    self.start_containers(engines)
                    
                    print(f"\nWaiting for containers to be ready...")
                    print("(This may take 30-60 seconds for servers to import libraries and start...)")
                    
                    max_retries = 12
                    retry_interval = 5
                    for retry in range(max_retries):
                        time.sleep(retry_interval)
                        print(f"  Checking... ({retry + 1}/{max_retries}) - {(retry + 1) * retry_interval}s elapsed")
                        statuses = self.check_containers(engines, timeout=10)
                        all_running = all("Running" in status for status in statuses.values())
                        if all_running:
                            print(f"\n✓ All servers ready after {(retry + 1) * retry_interval}s")
                            break
                    
                    if not all_running:
                        print(f"\n⚠ Some servers still not responding after {max_retries * retry_interval}s")
                        response = input("\nContinue anyway? (y/n): ")
                        if response.lower() != 'y':
                            return
                except Exception as e:
                    print(f"\n✗ Failed to start containers: {e}")
                    return
            else:
                print(f"\nExiting. Start containers manually and try again.")
                return
        
        print("\n✓ All containers ready\n")
        
        # Run benchmark
        print("Running benchmark...")
        print("-" * 80)
        
        results = {}
        
        for engine_name, engine_config in config["engines"].items():
            print(f"\nTesting {engine_name}...")
            port = self.engines[engine_name]["port"]
            base_url = f"http://localhost:{port}"
            
            model = engine_config.get("model", global_model)
            if not model:
                print(f"  ✗ No model specified for {engine_name}")
                results[engine_name] = {"error": "No model specified"}
                continue
            
            # Initialize
            print(f"  Initializing...")
            init_data = {
                "model": model,
                "tensor_parallel_size": engine_config.get("tensor_parallel_size", 1),
                "gpu_memory_utilization": engine_config.get("gpu_memory_utilization", 0.9),
                "dtype": engine_config.get("dtype", "auto"),
                "trust_remote_code": engine_config.get("trust_remote_code", False),
                "engine_kwargs": engine_config.get("engine_kwargs", {}),
            }
            
            if engine_config.get("quantization"):
                init_data["quantization"] = engine_config["quantization"]
            
            try:
                response = requests.post(f"{base_url}/initialize", json=init_data, timeout=300)
                response.raise_for_status()
                print(f"  ✓ Initialized")
            except Exception as e:
                print(f"  ✗ Initialization failed: {e}")
                results[engine_name] = {"error": str(e)}
                continue
            
            # Run prompts
            print(f"  Running {len(config['prompts'])} prompts...")
            
            start_time = time.perf_counter()
            prompt_results = []
            total_tokens = 0
            
            for i, prompt in enumerate(config["prompts"], 1):
                print(f"    [{i}/{len(config['prompts'])}]", end="\r")
                
                gen_data = {
                    "prompt": prompt,
                    "max_tokens": config.get("max_tokens", 256),
                    "temperature": config.get("temperature", 1.0),
                    "top_p": config.get("top_p", 1.0),
                }
                
                try:
                    response = requests.post(f"{base_url}/generate", json=gen_data, timeout=300)
                    response.raise_for_status()
                    result = response.json()
                    prompt_results.append(result)
                    total_tokens += result.get("tokens_generated", 0)
                except Exception as e:
                    print(f"\n    ✗ Request {i} failed: {e}")
                    prompt_results.append({"error": str(e)})
            
            end_time = time.perf_counter()
            total_time = end_time - start_time
            
            # Calculate metrics
            successful = [r for r in prompt_results if "error" not in r]
            latencies = [r["total_time"] for r in successful]
            
            if successful:
                avg_latency = sum(latencies) / len(latencies)
                throughput = total_tokens / total_time
                
                # Get memory
                try:
                    response = requests.get(f"{base_url}/memory", timeout=10)
                    memory = response.json()
                except:
                    memory = {}
                
                results[engine_name] = {
                    "success": True,
                    "total_requests": len(config["prompts"]),
                    "successful_requests": len(successful),
                    "total_time": total_time,
                    "total_tokens": total_tokens,
                    "throughput": throughput,
                    "avg_latency": avg_latency,
                    "memory": memory,
                }
                
                print(f"\n  ✓ Complete")
                print(f"    Throughput: {throughput:.2f} tokens/sec")
                print(f"    Avg Latency: {avg_latency:.3f}s")
            else:
                results[engine_name] = {"error": "All requests failed"}
                print(f"\n  ✗ All requests failed")
        
        # Print summary
        print("\n" + "="*80)
        print("Benchmark Results")
        print("="*80)
        print(f"\n{'Engine':<12} {'Throughput':<15} {'Latency':<12} {'Memory':<10}")
        print(f"{'':12} {'(tokens/sec)':<15} {'(sec)':<12} {'(GB)':<10}")
        print("-"*80)
        
        for engine, result in results.items():
            if result.get("success"):
                throughput = f"{result['throughput']:.2f}"
                latency = f"{result['avg_latency']:.3f}"
                memory = result.get("memory", {}).get("total_allocated_gb", 0)
                memory_str = f"{memory:.2f}" if memory else "N/A"
                print(f"{engine:<12} {throughput:<15} {latency:<12} {memory_str:<10}")
            else:
                print(f"{engine:<12} {'ERROR':<15} {'-':<12} {'-':<10}")
        
        print("="*80)
        
        # Save results
        output_file = config.get("output_file", "benchmark_results.json")
        with open(output_file, "w") as f:
            json.dump(results, f, indent=2)
        
        print(f"\nResults saved to: {output_file}")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="BenchX - Docker-based LLM inference benchmarking"
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Build command
    build_parser = subparsers.add_parser("build", help="Build Docker images")
    build_parser.add_argument(
        "--engines",
        nargs="+",
        choices=["vllm", "sglang", "tensorrt"],
        help="Engines to build (default: all)"
    )
    
    # Container commands
    container_parser = subparsers.add_parser("container", help="Manage Docker containers")
    container_subparsers = container_parser.add_subparsers(dest="container_command")
    
    start_parser = container_subparsers.add_parser("start", help="Start containers")
    start_parser.add_argument(
        "--engines",
        nargs="+",
        choices=["vllm", "sglang", "tensorrt"],
        help="Engines to start (default: all)"
    )
    
    stop_parser = container_subparsers.add_parser("stop", help="Stop containers")
    stop_parser.add_argument(
        "--engines",
        nargs="+",
        choices=["vllm", "sglang", "tensorrt"],
        help="Engines to stop (default: all)"
    )
    
    container_subparsers.add_parser("status", help="Check container status")
    
    # Run command
    run_parser = subparsers.add_parser("run", help="Run benchmark")
    run_parser.add_argument("--config", required=True, help="Path to benchmark config JSON")
    
    args = parser.parse_args()
    
    cli = BenchXCLI()
    
    if args.command == "build":
        cli.build_images(args.engines)
    
    elif args.command == "container":
        if args.container_command == "start":
            cli.start_containers(args.engines)
        elif args.container_command == "stop":
            cli.stop_containers(args.engines)
        elif args.container_command == "status":
            cli.check_containers()
        else:
            container_parser.print_help()
    
    elif args.command == "run":
        cli.run_benchmark(args.config)
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
