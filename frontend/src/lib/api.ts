import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const modelsApi = {
  getPopular: () => api.get('/models/popular'),
  search: (query: string) => api.get(`/models/search?query=${query}`),
};

export const deploymentsApi = {
  create: (data: any) => api.post('/deployments', data),
  getStatus: (jobId: string) => api.get(`/deployments/${jobId}`),
};

export default api;
