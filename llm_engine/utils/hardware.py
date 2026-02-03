import platform
import psutil
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


def detect_hardware() -> Dict[str, any]:
    info = {
        "platform": platform.system(),
        "cpu_count": psutil.cpu_count(logical=False),
        "cpu_count_logical": psutil.cpu_count(logical=True),
        "total_memory_gb": psutil.virtual_memory().total / (1024**3),
        "available_memory_gb": psutil.virtual_memory().available / (1024**3),
        "gpu_available": False,
        "gpu_count": 0,
        "gpu_type": None,
        "gpu_memory_gb": 0,
    }
    
    try:
        import pynvml
        pynvml.nvmlInit()
        gpu_count = pynvml.nvmlDeviceGetCount()
        info["gpu_available"] = gpu_count > 0
        info["gpu_count"] = gpu_count
        info["gpu_type"] = "nvidia"
        
        if gpu_count > 0:
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            gpu_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
            info["gpu_memory_gb"] = gpu_info.total / (1024**3)
            info["gpu_name"] = pynvml.nvmlDeviceGetName(handle)
        
        pynvml.nvmlShutdown()
    except Exception as e:
        logger.debug(f"NVIDIA GPU detection failed: {e}")
    
    if not info["gpu_available"]:
        try:
            import torch
            if torch.cuda.is_available() and hasattr(torch.version, 'hip'):
                info["gpu_available"] = True
                info["gpu_count"] = torch.cuda.device_count()
                info["gpu_type"] = "amd"
        except Exception as e:
            logger.debug(f"AMD GPU detection failed: {e}")
    
    if not info["gpu_available"] and platform.system() == "Darwin":
        try:
            import torch
            if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                info["gpu_available"] = True
                info["gpu_count"] = 1
                info["gpu_type"] = "apple_silicon"
        except Exception as e:
            logger.debug(f"Apple Silicon detection failed: {e}")
    
    return info


def get_gpu_info() -> List[Dict[str, any]]:
    gpus = []
    
    try:
        import pynvml
        pynvml.nvmlInit()
        gpu_count = pynvml.nvmlDeviceGetCount()
        
        for i in range(gpu_count):
            handle = pynvml.nvmlDeviceGetHandleByIndex(i)
            mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
            
            gpu = {
                "index": i,
                "name": pynvml.nvmlDeviceGetName(handle),
                "total_memory_gb": mem_info.total / (1024**3),
                "free_memory_gb": mem_info.free / (1024**3),
                "used_memory_gb": mem_info.used / (1024**3),
                "utilization": pynvml.nvmlDeviceGetUtilizationRates(handle).gpu,
            }
            gpus.append(gpu)
        
        pynvml.nvmlShutdown()
    except Exception as e:
        logger.warning(f"Failed to get GPU info: {e}")
    
    return gpus


def get_available_memory() -> Dict[str, float]:
    memory = {
        "ram_gb": psutil.virtual_memory().available / (1024**3),
        "gpu_gb": 0,
    }
    
    gpus = get_gpu_info()
    if gpus:
        memory["gpu_gb"] = sum(gpu["free_memory_gb"] for gpu in gpus)
    
    return memory


def select_best_device() -> str:
    hw = detect_hardware()
    
    if hw["gpu_available"]:
        if hw["gpu_type"] == "nvidia" or hw["gpu_type"] == "amd":
            return "cuda"
        elif hw["gpu_type"] == "apple_silicon":
            return "mps"
    
    return "cpu"


def estimate_model_memory(model_size_gb: float, quantization: str = "none") -> float:
    memory = model_size_gb
    
    if quantization in ["4bit", "awq", "gptq"]:
        memory *= 0.25
    elif quantization == "8bit":
        memory *= 0.5
    
    memory *= 1.5
    
    return memory


def can_fit_model(model_size_gb: float, quantization: str = "none") -> bool:
    required_memory = estimate_model_memory(model_size_gb, quantization)
    available = get_available_memory()
    
    if available["gpu_gb"] >= required_memory:
        return True
    
    if available["ram_gb"] >= required_memory:
        return True
    
    return False
