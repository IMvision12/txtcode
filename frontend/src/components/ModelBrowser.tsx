'use client';

import { useState, useEffect } from 'react';
import { Search, Download, Heart } from 'lucide-react';
import { modelsApi } from '@/lib/api';

interface Model {
  id: string;
  name: string;
  author: string;
  downloads: number;
  likes: number;
  tags: string[];
}

export default function ModelBrowser({ onSelectModel }: { onSelectModel: (model: Model) => void }) {
  const [models, setModels] = useState<Model[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const response = await modelsApi.getPopular();
      setModels(response.data);
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!search) {
      loadModels();
      return;
    }
    try {
      const response = await modelsApi.search(search);
      setModels(response.data);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-4 py-3 rounded-lg bg-white/10 text-white placeholder-gray-400 border border-white/20 focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2"
          >
            <Search size={20} />
            Search
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-white">Loading models...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((model) => (
            <div
              key={model.id}
              className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20 hover:border-purple-500 transition-all cursor-pointer"
              onClick={() => onSelectModel(model)}
            >
              <h3 className="text-xl font-bold text-white mb-2">{model.name}</h3>
              <p className="text-gray-300 mb-4">by {model.author}</p>
              
              <div className="flex gap-4 mb-4 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Download size={16} />
                  {(model.downloads / 1000000).toFixed(1)}M
                </span>
                <span className="flex items-center gap-1">
                  <Heart size={16} />
                  {(model.likes / 1000).toFixed(1)}K
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {model.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-purple-600/30 text-purple-200 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
