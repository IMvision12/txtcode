'use client';

import { useEffect } from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { useDeploymentStore } from '@/store/deployment';
import { getSocket } from '@/lib/socket';

export default function DeploymentMonitor({ onReset }: { onReset: () => void }) {
  const { progress, setProgress } = useDeploymentStore();

  useEffect(() => {
    const socket = getSocket();

    socket.on('deployment:progress', (data) => {
      setProgress({
        stage: data.stage,
        progress: data.progress,
        message: data.message,
      });
    });

    socket.on('deployment:complete', (data) => {
      setProgress({
        status: 'success',
        progress: 100,
        endpoint: data.endpoint,
        message: 'Deployment completed successfully!',
      });
    });

    socket.on('deployment:failed', (data) => {
      setProgress({
        status: 'failed',
        error: data.error,
        message: 'Deployment failed',
      });
    });

    return () => {
      socket.off('deployment:progress');
      socket.off('deployment:complete');
      socket.off('deployment:failed');
    };
  }, [setProgress]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 border border-white/20">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">
          Deployment Progress
        </h2>

        <div className="space-y-6">
          <div className="relative">
            <div className="h-4 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-500"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
            <div className="text-center text-white mt-2 font-semibold">
              {progress.progress}%
            </div>
          </div>

          <div className="bg-black/30 rounded-lg p-6 min-h-[200px]">
            <div className="flex items-start gap-3">
              {progress.status === 'processing' && (
                <Loader className="text-purple-400 animate-spin flex-shrink-0" size={24} />
              )}
              {progress.status === 'success' && (
                <CheckCircle className="text-green-400 flex-shrink-0" size={24} />
              )}
              {progress.status === 'failed' && (
                <XCircle className="text-red-400 flex-shrink-0" size={24} />
              )}
              
              <div className="flex-1">
                <div className="text-gray-300 mb-2">
                  <span className="font-semibold text-white">Stage:</span> {progress.stage}
                </div>
                <div className="text-gray-300">
                  <span className="font-semibold text-white">Status:</span> {progress.message}
                </div>
                
                {progress.endpoint && (
                  <div className="mt-4 p-4 bg-green-900/30 border border-green-500/50 rounded">
                    <div className="text-green-300 font-semibold mb-2">
                      Deployment Successful!
                    </div>
                    <div className="text-sm text-gray-300">
                      Endpoint: <code className="text-green-400">{progress.endpoint}</code>
                    </div>
                  </div>
                )}

                {progress.error && (
                  <div className="mt-4 p-4 bg-red-900/30 border border-red-500/50 rounded">
                    <div className="text-red-300 font-semibold mb-2">
                      Deployment Failed
                    </div>
                    <div className="text-sm text-gray-300">
                      Error: {progress.error}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {(progress.status === 'success' || progress.status === 'failed') && (
            <button
              onClick={onReset}
              className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-lg transition-colors"
            >
              Deploy Another Model
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
