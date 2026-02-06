"""BenchX CLI - Multi-mode LLM inference benchmarking.

Supports two modes:
1. Docker mode (default) - Production-ready, reproducible
2. Local mode - For Google Colab, quick testing
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
        # All resources are now inside the benchx package
        self.package_dir = Path(__file__).parent
        self.docker_dir = self.package_dir / "docker"
        self.servers_dir = self.package_dir / "servers"
        # Use current working directory for envs
        self.envs_dir = Path.cwd() / "envs"
        
        self.engines = {
            "vllm": {"port": 8000, "container": "benchx-vllm", "venv": "venv_vllm"},
            "sglang": {"port": 8001, "container": "benchx-sglang", "venv": "venv_sglang"},
            "tensorrt": {"port": 8002, "container": "benchx-tensorrt", "venv": "venv_tensorrt"},
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
            
            # Check if Docker daemon is running
            result = subprocess.run(
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
            # Try docker compose (v2 syntax)
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
                # Try docker compose first
                result = subprocess.run(
                    ["docker", "compose", "build", engine],
                    cwd=self.docker_dir,
                    check=True
                )
            except (subprocess.CalledProcessError, FileNotFoundError):
                # Fall back to docker-compose
                try:
                    result = subprocess.run(
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
        print("  benchx run docker --config benchmark.json")
        return True
    
    def setup_local(self, engines: List[str] = None):
        """Setup local venv environments for specified engines."""
        if engines is None:
            engines = ["vllm", "sglang", "tensorrt"]
        
        # Check for ninja if sglang is in engines
        if "sglang" in engines:
            try:
                subprocess.run(
                    ["ninja", "--version"],
                    capture_output=True,
                    check=True
                )
            except (subprocess.CalledProcessError, FileNotFoundError):
                print("⚠ WARNING: 'ninja' build tool not found!")
                print("\nSGLang requires ninja for FlashInfer compilation.")
                print("\nInstall ninja:")
                print("  - Ubuntu/Debian: sudo apt-get install ninja-build")
                print("  - macOS: brew install ninja")
                print("  - Windows: choco install ninja")
                print("  - Google Colab: !apt-get install -y ninja-build")
                print("\nContinuing anyway, but SGLang may fail to initialize...")
                time.sleep(3)
        
        print("="*80)
        print("BenchX Local Environment Setup")
        print("="*80)
        print(f"\nSetting up environments for: {', '.join(engines)}\n")
        
        self.envs_dir.mkdir(exist_ok=True)
        
        for i, engine in enumerate(engines, 1):
            print(f"[{i}/{len(engines)}] Setting up {engine}...")
            venv_path = self.envs_dir / self.engines[engine]["venv"]
            
            # Create venv
            print(f"  Creating virtual environment...")
            
            # Get pip/python paths
            if sys.platform == "win32":
                pip = venv_path / "Scripts" / "pip.exe"
                python = venv_path / "Scripts" / "python.exe"
            else:
                pip = venv_path / "bin" / "pip"
                python = venv_path / "bin" / "python"
            
            try:
                # Try without pip first (for Colab compatibility)
                import venv
                venv.create(str(venv_path), with_pip=False, symlinks=False)
                
                # Install pip manually using get-pip.py
                print(f"  Installing pip...")
                import urllib.request
                get_pip_url = "https://bootstrap.pypa.io/get-pip.py"
                get_pip_path = venv_path / "get-pip.py"
                urllib.request.urlretrieve(get_pip_url, get_pip_path)
                subprocess.run(
                    [str(python), str(get_pip_path)],
                    check=True,
                    capture_output=True,
                    text=True
                )
                get_pip_path.unlink()  # Clean up
                
            except Exception as e:
                print(f"  ✗ Failed to create venv: {e}")
                continue
            
            # Upgrade pip
            print(f"  Upgrading pip...")
            try:
                subprocess.run(
                    [str(pip), "install", "--upgrade", "pip"],
                    check=True,
                    capture_output=True,
                    text=True
                )
            except subprocess.CalledProcessError as e:
                print(f"  Warning: Could not upgrade pip: {e.stderr}")
            
            # Install dependencies
            print(f"  Installing {engine} and dependencies...")
            deps = ["fastapi", "uvicorn", "psutil", "torch"]
            
            if engine == "vllm":
                deps.append("vllm")
            elif engine == "sglang":
                deps.append("sglang[all]")
            elif engine == "tensorrt":
                deps.append("tensorrt-llm")
            
            try:
                subprocess.run(
                    [str(pip), "install"] + deps,
                    check=True,
                    capture_output=True,
                    text=True
                )
            except subprocess.CalledProcessError as e:
                print(f"  ✗ Installation failed: {e.stderr}")
                continue
            
            print(f"  ✓ {engine} environment ready\n")
            
            print(f"  ✓ {engine} environment ready\n")
        
        print("="*80)
        print("Setup Complete!")
        print("="*80)
        print("\nYou can now run benchmarks with:")
        print("  benchx run local --config benchmark.json")
        return True
    
    def start_local_server(self, engine: str, background: bool = True):
        """Start a local venv-based server."""
        if engine not in self.engines:
            print(f"Error: Unknown engine '{engine}'")
            return False
        
        venv_path = self.envs_dir / self.engines[engine]["venv"]
        port = self.engines[engine]["port"]
        
        if not venv_path.exists():
            print(f"Error: Environment for {engine} not found. Run 'benchx build local' first.")
            return False
        
        # Get python path
        if sys.platform == "win32":
            python = venv_path / "Scripts" / "python.exe"
        else:
            python = venv_path / "bin" / "python"
        
        server_script = self.servers_dir / f"{engine}_server.py"
        
        print(f"Starting {engine} server on port {port}...")
        
        if background:
            # Create log file for debugging
            log_dir = Path.cwd() / "logs"
            log_dir.mkdir(exist_ok=True)
            log_file = log_dir / f"{engine}_server.log"
            
            # Start in background with logging
            with open(log_file, "w") as f:
                if sys.platform == "win32":
                    subprocess.Popen(
                        [str(python), str(server_script), "--port", str(port)],
                        stdout=f,
                        stderr=subprocess.STDOUT,
                        creationflags=subprocess.CREATE_NEW_CONSOLE
                    )
                else:
                    subprocess.Popen(
                        [str(python), str(server_script), "--port", str(port)],
                        stdout=f,
                        stderr=subprocess.STDOUT
                    )
            print(f"✓ {engine} server started in background (logs: {log_file})")
        else:
            # Start in foreground
            subprocess.run([str(python), str(server_script), "--port", str(port)])
        
        return True
    
    def start_containers(self, engines: List[str] = None):
        """Start Docker containers."""
        if engines is None:
            engines = ["vllm", "sglang", "tensorrt"]
        
        print(f"\nStarting containers: {', '.join(engines)}...")
        
        try:
            # Try docker compose first
            subprocess.run(
                ["docker", "compose", "up", "-d"] + engines,
                cwd=self.docker_dir,
                check=True,
                capture_output=True
            )
        except (subprocess.CalledProcessError, FileNotFoundError):
            # Fall back to docker-compose
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
            # Try docker compose first
            subprocess.run(
                ["docker", "compose", "stop"] + engines,
                cwd=self.docker_dir,
                check=True,
                capture_output=True
            )
        except (subprocess.CalledProcessError, FileNotFoundError):
            # Fall back to docker-compose
            subprocess.run(
                ["docker-compose", "stop"] + engines,
                cwd=self.docker_dir,
                check=True,
                capture_output=True
            )
        
        print("✓ Containers stopped")
        return True
    
    def check_containers(self, engines: List[str] = None, timeout: int = 5):
        """Check which servers/containers are running."""
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
    
    def run_benchmark(self, config_path: str, use_local: bool = False):
        """Run benchmark from config file.
        
        Args:
            config_path: Path to benchmark config JSON
            use_local: If True, use local venv servers. If False, use Docker.
        """
        config_file = Path(config_path)
        if not config_file.exists():
            print(f"✗ Config file not found: {config_path}")
            return
        
        with open(config_file) as f:
            config = json.load(f)
        
        engines = list(config.get("engines", {}).keys())
        
        # Get model - can be at top level or per-engine
        global_model = config.get("model")
        
        mode = "Local (venv)" if use_local else "Docker"
        
        print("="*80)
        print(f"BenchX - {mode} Benchmark")
        print("="*80)
        print(f"\nEngines: {', '.join(engines)}")
        if global_model:
            print(f"Model: {global_model}")
        print(f"Prompts: {len(config.get('prompts', []))}")
        print(f"Max Tokens: {config.get('max_tokens', 256)}")
        
        # Warning for local mode with multiple engines
        if use_local and len(engines) > 1:
            print("\n⚠ WARNING: Running multiple engines in local mode")
            print("Each engine will load the model into GPU memory sequentially.")
            print("Make sure you have enough GPU memory or lower gpu_memory_utilization.")
            print("Tip: Set 'gpu_memory_utilization': 0.4 for each engine to share GPU.")
        
        print("="*80)
        
        # Check if containers are running
        print("\nChecking servers...")
        statuses = self.check_containers(engines)
        
        all_running = all("Running" in status for status in statuses.values())
        
        if not all_running:
            print(f"\n⚠ Not all {'containers' if not use_local else 'servers'} are running!")
            
            if use_local:
                print("\nStart servers with:")
                for engine, status in statuses.items():
                    if "Running" not in status:
                        print(f"  benchx server start {engine} local")
            else:
                print("\nStart containers with:")
                for engine, status in statuses.items():
                    if "Running" not in status:
                        print(f"  docker-compose up -d {engine}")
            
            response = input(f"\nStart {'servers' if use_local else 'containers'} automatically? (y/n): ")
            if response.lower() == 'y':
                try:
                    if use_local:
                        for engine in engines:
                            if "Running" not in statuses[engine]:
                                self.start_local_server(engine, background=True)
                    else:
                        self.start_containers(engines)
                    
                    print(f"\nWaiting for {'servers' if use_local else 'containers'} to be ready...")
                    print("(This may take 30-60 seconds for servers to import libraries and start...)")
                    
                    # Wait and check multiple times with longer intervals
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
                        print("\nTroubleshooting:")
                        if use_local:
                            print("1. Check server logs in ./logs/ directory:")
                            for engine in engines:
                                if "Running" not in statuses[engine]:
                                    print(f"   - logs/{engine}_server.log")
                            print("\n2. Common issues:")
                            print("   - Missing dependencies (vllm, sglang, tensorrt)")
                            print("   - CUDA/GPU not available")
                            print("   - Port already in use")
                            print("\n3. Test manually:")
                            print("   - curl http://localhost:8000/health")
                        else:
                            print("1. Check container status:")
                            print("   - Run: docker ps")
                            print("   - Check logs: docker logs benchx-vllm")
                            print("\n2. Common issues:")
                            print("   - Container crashed during startup")
                            print("   - GPU not accessible in Docker")
                            print("   - Port conflicts")
                        
                        response = input("\nContinue anyway? (y/n): ")
                        if response.lower() != 'y':
                            print("\nExiting.")
                            return
                except Exception as e:
                    print(f"\n✗ Failed to start {'servers' if use_local else 'containers'}: {e}")
                    return
            else:
                print(f"\nExiting. Start {'servers' if use_local else 'containers'} manually and try again.")
                return
        
        print("\n✓ All {'servers' if use_local else 'containers'} ready\n")
        
        # Run benchmark
        print("Running benchmark...")
        print("-" * 80)
        
        results = {}
        
        # Get global model if specified
        global_model = config.get("model")
        
        for engine_name, engine_config in config["engines"].items():
            print(f"\nTesting {engine_name}...")
            port = self.engines[engine_name]["port"]
            base_url = f"http://localhost:{port}"
            
            # Get model - use engine-specific if provided, otherwise use global
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
            
            # Only add quantization if specified (don't send None)
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
                
                # Shutdown engine in local mode to free GPU memory for next engine
                if use_local:
                    try:
                        print(f"  Shutting down {engine_name} to free GPU memory...")
                        requests.post(f"{base_url}/shutdown", timeout=30)
                    except:
                        pass  # Ignore shutdown errors
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
        description="BenchX - Multi-mode LLM inference benchmarking"
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Build command
    build_parser = subparsers.add_parser("build", help="Build environments or images")
    build_parser.add_argument(
        "mode",
        choices=["local", "docker"],
        help="local: Build local venv environments | docker: Build Docker images"
    )
    build_parser.add_argument(
        "--engines",
        nargs="+",
        choices=["vllm", "sglang", "tensorrt"],
        help="Engines to build (default: all)"
    )
    
    # Server commands
    server_parser = subparsers.add_parser("server", help="Manage servers")
    server_subparsers = server_parser.add_subparsers(dest="server_command")
    
    start_parser = server_subparsers.add_parser("start", help="Start server")
    start_parser.add_argument("engine", choices=["vllm", "sglang", "tensorrt"])
    start_parser.add_argument(
        "mode",
        choices=["local", "docker"],
        help="local: Use local venv | docker: Use Docker"
    )
    start_parser.add_argument("--foreground", action="store_true", help="Run in foreground")
    
    stop_parser = server_subparsers.add_parser("stop", help="Stop server")
    stop_parser.add_argument("engine", choices=["vllm", "sglang", "tensorrt"])
    stop_parser.add_argument(
        "mode",
        choices=["local", "docker"],
        help="local: Use local venv | docker: Use Docker"
    )
    
    server_subparsers.add_parser("status", help="Check server status")
    
    logs_parser = server_subparsers.add_parser("logs", help="View server logs (local mode only)")
    logs_parser.add_argument("engine", choices=["vllm", "sglang", "tensorrt"])
    logs_parser.add_argument("--lines", type=int, default=50, help="Number of lines to show (default: 50)")
    
    # Container commands (Docker only)
    container_parser = subparsers.add_parser("container", help="Manage Docker containers")
    container_subparsers = container_parser.add_subparsers(dest="container_command")
    
    cont_start_parser = container_subparsers.add_parser("start", help="Start containers")
    cont_start_parser.add_argument(
        "--engines",
        nargs="+",
        choices=["vllm", "sglang", "tensorrt"],
        help="Engines to start (default: all)"
    )
    
    cont_stop_parser = container_subparsers.add_parser("stop", help="Stop containers")
    cont_stop_parser.add_argument(
        "--engines",
        nargs="+",
        choices=["vllm", "sglang", "tensorrt"],
        help="Engines to stop (default: all)"
    )
    
    container_subparsers.add_parser("status", help="Check container status")
    
    # Run command
    run_parser = subparsers.add_parser("run", help="Run benchmark")
    run_parser.add_argument(
        "mode",
        choices=["local", "docker"],
        help="local: Use local venv servers | docker: Use Docker containers"
    )
    run_parser.add_argument("--config", required=True, help="Path to benchmark config JSON")
    
    args = parser.parse_args()
    
    cli = BenchXCLI()
    
    if args.command == "build":
        if args.mode == "local":
            cli.setup_local(args.engines)
        else:  # docker
            cli.build_images(args.engines)
    
    elif args.command == "server":
        if args.server_command == "start":
            if args.mode == "local":
                cli.start_local_server(args.engine, background=not args.foreground)
            else:  # docker
                cli.start_containers([args.engine])
        elif args.server_command == "stop":
            if args.mode == "local":
                print("Stop local servers manually (Ctrl+C or kill process)")
            else:  # docker
                cli.stop_containers([args.engine])
        elif args.server_command == "status":
            cli.check_containers()
        elif args.server_command == "logs":
            log_file = Path.cwd() / "logs" / f"{args.engine}_server.log"
            if log_file.exists():
                print(f"=== Last {args.lines} lines of {args.engine} server log ===\n")
                with open(log_file) as f:
                    lines = f.readlines()
                    for line in lines[-args.lines:]:
                        print(line, end="")
            else:
                print(f"Log file not found: {log_file}")
                print("Logs are only available for local mode servers.")
        else:
            server_parser.print_help()
    
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
        use_local = (args.mode == "local")
        cli.run_benchmark(args.config, use_local=use_local)
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
