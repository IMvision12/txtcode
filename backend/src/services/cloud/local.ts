import { DeploymentConfig, ProgressCallback } from '../deployment';

export async function deployLocally(
  config: DeploymentConfig,
  onProgress: ProgressCallback
) {
  onProgress('local', 75, 'Setting up local environment...');
  
  // Mock local deployment
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  onProgress('local', 85, 'Installing dependencies...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  onProgress('local', 95, 'Starting local inference server...');
  await new Promise(resolve => setTimeout(resolve, 1000));
}
