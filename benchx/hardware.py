"""Hardware detection and management."""

import subprocess
from typing import Dict, Optional, List
from dataclasses import dataclass


@dataclass
class GPUInfo:
    """GPU hardware information."""
    
    name: str
    memory_gb: float
    compute_capability: Optional[str] = None
    driver_version: Optional[str] = None
    cuda_version: Optional[str] = None


class HardwareDetector:
    """Detect and validate hardware configuration."""
    
    KNOWN_GPUS = {
        "H100": {"memory_gb": 80, "compute": "9.0"},
        "A100": {"memory_gb": 80, "compute": "8.0"},
        "A10": {"memory_gb": 24, "compute": "8.6"},
        "RTX4090": {"memory_gb": 24, "compute": "8.9"},
    }
    
    @staticmethod
    def detect_gpus() -> List[GPUInfo]:
        """Detect available GPUs."""
        try:
            import torch
            if not torch.cuda.is_available():
                return []
            
            gpus = []
            for i in range(torch.cuda.device_count()):
                props = torch.cuda.get_device_properties(i)
                gpus.append(GPUInfo(
                    name=props.name,
                    memory_gb=props.total_memory / 1e9,
                    compute_capability=f"{props.major}.{props.minor}",
                ))
            return gpus
        except ImportError:
            # Fallback to nvidia-smi
            return HardwareDetector._detect_via_nvidia_smi()
    
    @staticmethod
    def _detect_via_nvidia_smi() -> List[GPUInfo]:
        """Detect GPUs using nvidia-smi."""
        try:
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"],
                capture_output=True,
                text=True,
                check=True
            )
            
            gpus = []
            for line in result.stdout.strip().split("\n"):
                if line:
                    name, memory = line.split(",")
                    memory_gb = float(memory.strip().split()[0]) / 1024
                    gpus.append(GPUInfo(name=name.strip(), memory_gb=memory_gb))
            return gpus
        except (subprocess.CalledProcessError, FileNotFoundError):
            return []
    
    @staticmethod
    def validate_hardware(requested: List[str]) -> Dict[str, bool]:
        """Validate requested hardware is available."""
        detected = HardwareDetector.detect_gpus()
        detected_names = [gpu.name for gpu in detected]
        
        validation = {}
        for hw in requested:
            # Check if exact match or partial match
            validation[hw] = any(hw.lower() in name.lower() for name in detected_names)
        
        return validation
    
    @staticmethod
    def get_optimal_config(gpu_name: str) -> Dict[str, any]:
        """Get optimal engine config for GPU."""
        gpu_info = HardwareDetector.KNOWN_GPUS.get(gpu_name, {})
        
        return {
            "gpu_memory_utilization": 0.9,
            "max_model_len": int(gpu_info.get("memory_gb", 24) * 1000),  # Rough estimate
            "dtype": "float16" if gpu_info.get("compute", "8.0") >= "8.0" else "float32",
        }
