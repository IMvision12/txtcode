import Queue from 'bull';
import { Server } from 'socket.io';
import { processDeployment } from './deployment';

let deploymentQueue: Queue.Queue;

export function initializeQueue(io: Server) {
  deploymentQueue = new Queue('deployments', {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    }
  });

  deploymentQueue.process(async (job) => {
    const { modelId, modelName, target, optimizations } = job.data;
    
    // Emit progress updates
    const emitProgress = (stage: string, progress: number, message: string) => {
      io.emit('deployment:progress', {
        jobId: job.id,
        stage,
        progress,
        message
      });
      job.progress(progress);
    };

    try {
      await processDeployment(job.data, emitProgress);
      
      io.emit('deployment:complete', {
        jobId: job.id,
        status: 'success',
        endpoint: `https://api.neuralops.com/models/${job.id}`
      });
      
      return { success: true };
    } catch (error) {
      io.emit('deployment:failed', {
        jobId: job.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  });

  deploymentQueue.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err);
  });
}

export async function createDeploymentJob(data: any) {
  return deploymentQueue.add(data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    }
  });
}
