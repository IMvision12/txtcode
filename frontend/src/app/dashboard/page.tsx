'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const [deployments, setDeployments] = useState([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f]"></div>
        <div className="absolute top-0 -left-40 w-[500px] h-[500px] bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-0 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-cyan-600/20 to-teal-600/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 container mx-auto px-6 py-3">
        <div className="flex items-center justify-between backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl px-4 py-2 shadow-2xl">
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="/logo.png" 
              alt="DeployLLM" 
              width={200} 
              height={60}
              className="h-10 w-auto"
              style={{
                filter: 'brightness(1.8) contrast(1.3) saturate(1.2) drop-shadow(0 0 15px rgba(59, 130, 246, 0.6))'
              }}
              priority
            />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              DeployLLM
            </span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-6 text-gray-300 text-sm font-medium">
            <Link href="/dashboard" className="text-cyan-400 transition-colors">Dashboard</Link>
            <Link href="/deployments" className="hover:text-cyan-400 transition-colors">Deployments</Link>
            <Link href="/models" className="hover:text-cyan-400 transition-colors">Models</Link>
            <Link href="/docs" className="hover:text-cyan-400 transition-colors">Docs</Link>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-gray-300 text-sm">
              <span className="text-gray-500">Welcome, </span>
              <span className="font-semibold">{user.user_metadata?.full_name || user.email}</span>
            </div>
            <button
              onClick={signOut}
              className="text-gray-300 hover:text-white transition-colors px-3 py-1.5 text-sm font-medium border border-white/10 rounded-lg hover:border-red-500/50 hover:bg-red-500/10"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="relative z-10 container mx-auto px-6 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">
              Welcome back, <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {user.user_metadata?.full_name || 'User'}
              </span>
            </h1>
            <p className="text-gray-400 text-lg">
              Manage your AI model deployments and monitor performance
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🚀</span>
                </div>
                <span className="text-3xl font-bold text-white">0</span>
              </div>
              <h3 className="text-gray-400 text-sm font-medium">Active Deployments</h3>
            </div>

            <div className="backdrop-blur-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
                <span className="text-3xl font-bold text-white">0</span>
              </div>
              <h3 className="text-gray-400 text-sm font-medium">Successful Deploys</h3>
            </div>

            <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🤖</span>
                </div>
                <span className="text-3xl font-bold text-white">0</span>
              </div>
              <h3 className="text-gray-400 text-sm font-medium">Models Deployed</h3>
            </div>

            <div className="backdrop-blur-xl bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">⚡</span>
                </div>
                <span className="text-3xl font-bold text-white">0</span>
              </div>
              <h3 className="text-gray-400 text-sm font-medium">API Requests</h3>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link href="/models" className="group backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">🔍</span>
                </div>
                <h3 className="text-white text-xl font-bold mb-2">Browse Models</h3>
                <p className="text-gray-400 text-sm">Explore 10,000+ AI models from Hugging Face</p>
              </Link>

              <Link href="/deployments/new" className="group backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-green-500/50 hover:bg-green-500/5 transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">➕</span>
                </div>
                <h3 className="text-white text-xl font-bold mb-2">New Deployment</h3>
                <p className="text-gray-400 text-sm">Deploy a new model to cloud or local</p>
              </Link>

              <Link href="/docs" className="group backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">📚</span>
                </div>
                <h3 className="text-white text-xl font-bold mb-2">Documentation</h3>
                <p className="text-gray-400 text-sm">Learn how to optimize and deploy models</p>
              </Link>
            </div>
          </div>

          {/* Recent Deployments */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Recent Deployments</h2>
              <Link href="/deployments" className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors">
                View all →
              </Link>
            </div>
            
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🚀</div>
                <h3 className="text-white text-xl font-bold mb-2">No deployments yet</h3>
                <p className="text-gray-400 mb-6">Get started by deploying your first AI model</p>
                <Link 
                  href="/models"
                  className="inline-block bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg shadow-blue-500/50 hover:shadow-cyan-500/60 transition-all"
                >
                  Browse Models
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
