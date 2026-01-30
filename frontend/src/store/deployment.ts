import { create } from 'zustand';

interface Model {
  id: string;
  name: string;
  author: string;
  downloads: number;
  likes: number;
  tags: string[];
}

interface DeploymentConfig {
  target: 'aws' | 'gcp' | 'local';
  optimizations: {
    quantization: 'none' | '4bit' | '8bit';
    engine: 'vllm' | 'tensorrt' | 'sglang' | 'tgi';
  };
}

interface DeploymentProgress {
  jobId: string | null;
  stage: string;
  progress: number;
  message: string;
  status: 'idle' | 'processing' | 'success' | 'failed';
  endpoint?: string;
  error?: string;
}

interface DeploymentStore {
  selectedModel: Model | null;
  config: DeploymentConfig;
  progress: DeploymentProgress;
  setSelectedModel: (model: Model | null) => void;
  setConfig: (config: DeploymentConfig) => void;
  setProgress: (progress: Partial<DeploymentProgress>) => void;
  resetProgress: () => void;
}

export const useDeploymentStore = create<DeploymentStore>((set) => ({
  selectedModel: null,
  config: {
    target: 'aws',
    optimizations: {
      quantization: 'none',
      engine: 'vllm',
    },
  },
  progress: {
    jobId: null,
    stage: '',
    progress: 0,
    message: '',
    status: 'idle',
  },
  setSelectedModel: (model) => set({ selectedModel: model }),
  setConfig: (config) => set({ config }),
  setProgress: (progress) =>
    set((state) => ({
      progress: { ...state.progress, ...progress },
    })),
  resetProgress: () =>
    set({
      progress: {
        jobId: null,
        stage: '',
        progress: 0,
        message: '',
        status: 'idle',
      },
    }),
}));
