export interface Model {
  id: string;
  name: string;
  author: string;
  downloads: number;
  likes: number;
  tags: string[];
}

export async function getPopularModels(): Promise<Model[]> {
  // Mock data - replace with actual Hugging Face API calls
  return [
    {
      id: 'meta-llama/Llama-2-7b-hf',
      name: 'Llama 2 7B',
      author: 'Meta',
      downloads: 1500000,
      likes: 5000,
      tags: ['text-generation', 'llama']
    },
    {
      id: 'mistralai/Mistral-7B-v0.1',
      name: 'Mistral 7B',
      author: 'Mistral AI',
      downloads: 1200000,
      likes: 4500,
      tags: ['text-generation', 'mistral']
    },
    {
      id: 'google/flan-t5-base',
      name: 'FLAN-T5 Base',
      author: 'Google',
      downloads: 800000,
      likes: 3000,
      tags: ['text2text-generation', 't5']
    }
  ];
}

export async function searchModels(query: string): Promise<Model[]> {
  const models = await getPopularModels();
  if (!query) return models;
  
  return models.filter(m => 
    m.name.toLowerCase().includes(query.toLowerCase()) ||
    m.author.toLowerCase().includes(query.toLowerCase())
  );
}
