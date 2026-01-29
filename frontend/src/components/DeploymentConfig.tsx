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
        <p className="text-gray-300 mb-8">Configure deployment settings</p>

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
            <h3 className="text-xl font-semibold text-white mb-4">Optimizations</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white mb-2">Quantization</label>
                <select
                  value={config.optimizations.quantization}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      optimizations: {
                        ...config.optimizations,
                        quantization: e.target.value as any,
                      },
                    })
                  }
                  className="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 focus:outline-none focus:border-purple-500"
                >
                  <option value="none">None</option>
                  <option value="4bit">4-bit</option>
                  <option value="8bit">8-bit</option>
                </select>
              </div>

              <label className="flex items-center gap-3 text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.optimizations.lora}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      optimizations: {
                        ...config.optimizations,
                        lora: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5"
                />
                <span>Apply LoRA Fine-tuning</span>
              </label>

              <label className="flex items-center gap-3 text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.optimizations.vllm}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      optimizations: {
                        ...config.optimizations,
                        vllm: e.target.checked,
                      },
                    })
                  }
                  className="w-5 h-5"
                />
                <span>Enable vLLM Optimization</span>
              </label>
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
