'use client';

import { useState } from 'react';
import { Cloud, Server, Laptop, ArrowLeft } from 'lucide-react';
import { useDeploymentStore } from '@/store/deployment';
import { deploymentsApi } from '@/lib/api';

export default function DeploymentConfig({ 
  model, 
  onDeploy, 
  onBack 
}: { 
  model: any; 
  onDeploy: () => void;
  onBack: () => void;
}) {
  const { config, setConfig, setProgress } = useDeploymentStore();
  const [deploying, setDeploying] = useState(false);

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      const response = await deploymentsApi.create({
        modelId: model.id,
        modelName: model.name,
        target: config.target,
        optimizations: config.optimizations,
      });

      setProgress({
        jobId: response.data.jobId,
        status: 'processing',
        progress: 0,
        message: 'Starting deployment...',
      });

      onDeploy();
    } catch (error) {
      console.error('Deployment failed:', error);
      alert('Failed to start deployment');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-gray-300 hover:text-white"
      >
        <ArrowLeft size={20} />
        Back to models
      </button>

      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 border border-white/20">
        <h2 className="text-3xl font-bold text-white mb-2">{model.name}</h2>
        <p className="text-gray-300 mb-8">Configure inference deployment settings</p>

        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">Deployment Target</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'aws', label: 'AWS', icon: Cloud },
                { id: 'gcp', label: 'GCP', icon: Server },
                { id: 'local', label: 'Local', icon: Laptop },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setConfig({ ...config, target: id as any })}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    config.target === id
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-white/20 bg-white/5 hover:border-white/40'
                  }`}
                >
                  <Icon className="mx-auto mb-2 text-white" size={32} />
                  <div className="text-white font-semibold">{label}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-white mb-4">Inference Configuration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white mb-2">Inference Engine</label>
                <select
                  value={config.optimizations.engine || 'vllm'}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      optimizations: {
                        ...config.optimizations,
                        engine: e.target.value as any,
                      },
                    })
                  }
                  className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:border-purple-500"
                >
                  <option value="vllm">vLLM</option>
                  <option value="tgi">TGI (Text Generation Inference)</option>
                  <option value="tensorrt">TensorRT-LLM</option>
                  <option value="sglang">SGLang</option>
                </select>
              </div>

              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-5">
                {config.optimizations.engine === 'vllm' && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">⚡</span>
                      <h4 className="text-white font-semibold text-lg">vLLM - High-Throughput Inference</h4>
                    </div>
                    <p className="text-sm text-blue-200 mb-3">Optimized for high throughput batch inference with advanced memory management</p>
                    <div className="space-y-2">
                      <div className="text-xs text-gray-300">
                        <span className="font-semibold text-white">Quantization:</span> INT4, INT8, FP8
                      </div>
                      <div className="text-xs text-gray-300">
                        <span className="font-semibold text-white">Features:</span> Paged Attention, Continuous Batching
                      </div>
                      <div className="text-xs text-gray-300">
                        <span className="font-semibold text-white">Best for:</span> High-throughput serving, batch processing
                      </div>
                    </div>
                  </div>
                )}
                
                {config.optimizations.engine === 'tgi' && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">🔥</span>
                      <h4 className="text-white font-semibold text-lg">TGI - Production-Ready Inference</h4>
                    </div>
                    <p className="text-sm text-blue-200 mb-3">HuggingFace's official inference server with enterprise features</p>
                    <div className="space-y-2">
                      <div className="text-xs text-gray-300">
                        <span className="font-semibold text-white">Quantization:</span> INT4, INT8, GPTQ, AWQ
                      </div>
                      <div className="text-xs text-gray-300">
                        <span className="font-semibold text-white">Features:</span> Token Streaming, Tensor Parallelism, Flash Attention
                      </div>
                      <div className="text-xs text-gray-300">
                        <span className="font-semibold text-white">Best for:</span> Production deployments, streaming responses
                      </div>
                    </div>
                  </div>
                )}
                
                {config.optimizations.engine === 'tensorrt' && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">🚀</span>
                      <h4 className="text-white font-semibold text-lg">TensorRT-LLM - Ultra Low Latency</h4>
                    </div>
                    <p className="text-sm text-blue-200 mb-3">NVIDIA's optimized engine for lowest latency on NVIDIA GPUs</p>
                    <div className="space-y-2">
                      <div className="text-xs text-gray-300">
                        <span className="font-semibold text-white">Quantization:</span> INT4, INT8, FP8, AWQ
                      </div>
                      <div className="text-xs text-gray-300">
                        <span className="font-semibold text-white">Features:</span> In-flight Batching, Multi-GPU Support, KV Cache Optimization
                      </div>
                      <div className="text-xs text-gray-300">
                        <span className="font-semibold text-white">Best for:</span> Real-time applications, lowest latency requirements
                      </div>
                    </div>
                  </div>
                )}
                
                {config.optimizations.engine === 'sglang' && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">📝</span>
                      <h4 className="text-white font-semibold text-lg">SGLang - Structured Generation</h4>
                    </div>
                    <p className="text-sm text-blue-200 mb-3">Optimized for structured outputs and complex prompt workflows</p>
                    <div className="space-y-2">
                      <div className="text-xs text-gray-300">
                        <span className="font-semibold text-white">Quantization:</span> INT4, INT8, FP8
                      </div>
                      <div className="text-xs text-gray-300">
                        <span className="font-semibold text-white">Features:</span> RadixAttention, Constrained Decoding, JSON Mode
                      </div>
                      <div className="text-xs text-gray-300">
                        <span className="font-semibold text-white">Best for:</span> Structured outputs, complex prompts, function calling
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleDeploy}
            disabled={deploying}
            className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-semibold text-lg transition-colors"
          >
            {deploying ? 'Starting Deployment...' : 'Deploy Model'}
          </button>
        </div>
      </div>
    </div>
  );
}
