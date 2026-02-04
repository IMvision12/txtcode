"""Config fairness checker to ensure apples-to-apples comparisons."""

from typing import Dict, List, Any
from dataclasses import dataclass


@dataclass
class ConfigMismatch:
    """Detected configuration mismatch."""
    
    parameter: str
    engine1: str
    value1: Any
    engine2: str
    value2: Any
    severity: str  # "critical", "warning", "info"
    
    def __str__(self):
        return (
            f"[{self.severity.upper()}] {self.parameter}: "
            f"{self.engine1}={self.value1} vs {self.engine2}={self.value2}"
        )


class FairnessChecker:
    """Ensures fair comparison across engines."""
    
    CRITICAL_PARAMS = [
        "tensor_parallel_size",
        "max_tokens",
        "dtype",
    ]
    
    WARNING_PARAMS = [
        "gpu_memory_utilization",
        "batch_size",
    ]
    
    # Map engine-specific param names to standard names
    PARAM_MAPPINGS = {
        "vllm": {
            "tensor_parallel_size": "tensor_parallel_size",
            "tp": "tensor_parallel_size",
        },
        "sglang": {
            "tp_size": "tensor_parallel_size",
            "tensor_parallel": "tensor_parallel_size",
        },
        "tensorrt": {
            "world_size": "tensor_parallel_size",
        },
    }
    
    def check_configs(
        self,
        configs: Dict[str, Dict[str, Any]]
    ) -> List[ConfigMismatch]:
        """Check for config mismatches across engines."""
        mismatches = []
        
        # Normalize configs
        normalized = {}
        for engine, config in configs.items():
            normalized[engine] = self._normalize_config(engine, config)
        
        # Compare all pairs
        engines = list(normalized.keys())
        for i, engine1 in enumerate(engines):
            for engine2 in engines[i + 1:]:
                mismatches.extend(
                    self._compare_configs(
                        engine1, normalized[engine1],
                        engine2, normalized[engine2]
                    )
                )
        
        return mismatches
    
    def _normalize_config(self, engine: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize engine-specific config to standard format."""
        normalized = {}
        mappings = self.PARAM_MAPPINGS.get(engine, {})
        
        for key, value in config.items():
            standard_key = mappings.get(key, key)
            normalized[standard_key] = value
        
        return normalized
    
    def _compare_configs(
        self,
        engine1: str,
        config1: Dict[str, Any],
        engine2: str,
        config2: Dict[str, Any]
    ) -> List[ConfigMismatch]:
        """Compare two normalized configs."""
        mismatches = []
        
        # Check critical params
        for param in self.CRITICAL_PARAMS:
            val1 = config1.get(param)
            val2 = config2.get(param)
            if val1 != val2:
                mismatches.append(ConfigMismatch(
                    parameter=param,
                    engine1=engine1,
                    value1=val1,
                    engine2=engine2,
                    value2=val2,
                    severity="critical"
                ))
        
        # Check warning params
        for param in self.WARNING_PARAMS:
            val1 = config1.get(param)
            val2 = config2.get(param)
            if val1 != val2:
                mismatches.append(ConfigMismatch(
                    parameter=param,
                    engine1=engine1,
                    value1=val1,
                    engine2=engine2,
                    value2=val2,
                    severity="warning"
                ))
        
        return mismatches
    
    def auto_fix_configs(
        self,
        configs: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Dict[str, Any]]:
        """Automatically fix config mismatches where possible."""
        mismatches = self.check_configs(configs)
        
        if not mismatches:
            return configs
        
        # Use first engine's config as reference
        reference_engine = list(configs.keys())[0]
        reference_config = configs[reference_engine]
        
        fixed_configs = {}
        for engine, config in configs.items():
            fixed = config.copy()
            
            # Apply reference values for critical params
            for param in self.CRITICAL_PARAMS:
                if param in reference_config:
                    # Map to engine-specific param name
                    engine_param = self._get_engine_param_name(engine, param)
                    fixed[engine_param] = reference_config[param]
            
            fixed_configs[engine] = fixed
        
        return fixed_configs
    
    def _get_engine_param_name(self, engine: str, standard_param: str) -> str:
        """Get engine-specific parameter name."""
        mappings = self.PARAM_MAPPINGS.get(engine, {})
        # Reverse lookup
        for engine_param, std_param in mappings.items():
            if std_param == standard_param:
                return engine_param
        return standard_param
