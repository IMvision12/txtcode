'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-float-slow"></div>
        
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-blue-400/30 rounded-full animate-float-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }}
          />
        ))}
        
        {/* Mouse follower gradient */}
        <div 
          className="absolute w-96 h-96 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl pointer-events-none transition-all duration-1000 ease-out"
          style={{
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">D</span>
          </div>
          <span className="text-white text-2xl font-bold">DeployLLM</span>
        </div>
        
        <div className="hidden md:flex items-center space-x-8 text-gray-300">
          <Link href="#features" className="hover:text-white transition">Features</Link>
          <Link href="#pricing" className="hover:text-white transition">Pricing</Link>
          <Link href="#docs" className="hover:text-white transition">Docs</Link>
          <Link href="#about" className="hover:text-white transition">About</Link>
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowSignIn(true)}
            className="text-white hover:text-gray-300 transition px-4 py-2"
          >
            Sign In
          </button>
          <button 
            onClick={() => setShowSignUp(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition"
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-6 pt-20 pb-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full animate-slide-down">
            <span className="text-blue-400 text-sm font-medium">🚀 Deploy AI Models in Minutes</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight animate-slide-up">
            Deploy
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 text-transparent bg-clip-text animate-gradient"> LLMs </span>
            to Any Cloud
          </h1>
          
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed animate-fade-in">
            Browse Hugging Face models or upload your own, apply automatic quantization, 
            then deploy to AWS, GCP, or locally with vLLM optimization.
          </p>

          <div className="flex items-center justify-center mb-16 animate-fade-in-delayed">
            <button 
              onClick={() => setShowSignUp(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-2xl hover:shadow-blue-500/50 transition transform hover:scale-105 animate-bounce-subtle"
            >
              Get Started Free
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="animate-count-up" style={{ animationDelay: '0.2s' }}>
              <div className="text-3xl font-bold text-white mb-1">10K+</div>
              <div className="text-gray-400 text-sm">Models Available</div>
            </div>
            <div className="animate-count-up" style={{ animationDelay: '0.4s' }}>
              <div className="text-3xl font-bold text-white mb-1">99.9%</div>
              <div className="text-gray-400 text-sm">Uptime SLA</div>
            </div>
            <div className="animate-count-up" style={{ animationDelay: '0.6s' }}>
              <div className="text-3xl font-bold text-white mb-1">50%</div>
              <div className="text-gray-400 text-sm">Cost Savings</div>
            </div>
          </div>
        </div>
      </div>

      {/* Animated Server Center Visualization */}
      <div className="relative z-10 container mx-auto px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 animate-slide-up">
              Live Deployment Pipeline
            </h2>
            <p className="text-gray-400 text-lg animate-fade-in">Watch your models deploy across cloud infrastructure in real-time</p>
          </div>
          
          <div className="relative bg-gradient-to-br from-slate-900/80 to-blue-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-12 md:p-20 overflow-hidden shadow-2xl">
            {/* Enhanced background grid with glow */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.4) 1px, transparent 1px)',
                backgroundSize: '50px 50px'
              }}></div>
              {/* Grid glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-cyan-500/5"></div>
            </div>

            {/* Enhanced data flow lines - removed old SVG */}
            
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-24">
              {/* Source: Model Repository - Enhanced */}
              <div className="flex flex-col items-center space-y-6">
                <div className="text-blue-400 text-xs font-bold tracking-wider mb-2 uppercase">Source</div>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-3xl blur-xl group-hover:blur-2xl transition-all"></div>
                  <div className="relative w-40 h-40 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl border-2 border-blue-500/40 flex items-center justify-center backdrop-blur-sm animate-pulse-slow hover:scale-110 transition-transform cursor-pointer shadow-xl">
                    <div className="text-7xl animate-bounce-subtle">🤗</div>
                  </div>
                  {/* Enhanced status indicator */}
                  <div className="absolute -top-3 -right-3 flex items-center space-x-1">
                    <div className="relative">
                      <div className="w-8 h-8 bg-green-500 rounded-full animate-ping absolute"></div>
                      <div className="w-8 h-8 bg-green-500 rounded-full relative flex items-center justify-center">
                        <span className="text-white text-xs font-bold">✓</span>
                      </div>
                    </div>
                  </div>
                  {/* Pulse rings */}
                  <div className="absolute inset-0 rounded-3xl border-2 border-blue-400/50 animate-ping-slow"></div>
                </div>
                <div className="text-white font-bold text-xl">Hugging Face</div>
                
                {/* Upload Option */}
                <div className="relative w-full">
                  <div className="text-gray-500 text-xs text-center mb-2">OR</div>
                  <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-2 border-dashed border-emerald-500/30 rounded-xl p-4 backdrop-blur-sm hover:border-emerald-500/50 transition-all cursor-pointer group">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="text-3xl group-hover:scale-110 transition-transform">📤</div>
                      <div className="text-emerald-400 text-sm font-semibold">Upload Model</div>
                      <div className="text-gray-500 text-xs">Custom models supported</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Arrow 1: Source to Processing */}
              <div className="hidden md:block absolute left-[26%] top-[42%] w-[15%] z-20">
                <svg width="100%" height="40" viewBox="0 0 200 40" className="overflow-visible">
                  <defs>
                    <linearGradient id="arrowGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  {/* Dashed line */}
                  <line 
                    x1="0" y1="20" x2="180" y2="20" 
                    stroke="url(#arrowGrad1)" 
                    strokeWidth="2.5" 
                    strokeDasharray="6 4"
                    className="animate-dash-flow"
                  />
                  {/* Arrow head */}
                  <polygon 
                    points="180,20 170,15 170,25" 
                    fill="#8b5cf6"
                  />
                  {/* Animated dots */}
                  <circle r="3" fill="#3b82f6" className="animate-dot-travel">
                    <animate attributeName="cx" from="0" to="180" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0;1;1;0" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle r="3" fill="#60a5fa" className="animate-dot-travel">
                    <animate attributeName="cx" from="0" to="180" dur="2s" begin="0.5s" repeatCount="indefinite" />
                    <animate attributeName="cy" from="20" to="20" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0;1;1;0" dur="2s" begin="0.5s" repeatCount="indefinite" />
                  </circle>
                </svg>
              </div>

              {/* Processing: Optimization Pipeline - Enhanced */}
              <div className="flex flex-col items-center space-y-6">
                <div className="text-purple-400 text-xs font-bold tracking-wider mb-2 uppercase">Processing</div>
                <div className="space-y-4 w-full">
                  {[
                    { name: 'Quantization', icon: '🔢', progress: 85, color: 'from-purple-500 to-pink-500' },
                    { name: 'vLLM Compile', icon: '⚡', progress: 92, color: 'from-pink-500 to-orange-500' }
                  ].map((step, i) => (
                    <div key={i} className="relative group">
                      <div 
                        className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-5 backdrop-blur-sm animate-slide-in-right hover:border-purple-400/50 transition-all shadow-lg hover:shadow-purple-500/20"
                        style={{ animationDelay: `${i * 0.3}s` }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{step.icon}</span>
                            <span className="text-white text-sm font-semibold">{step.name}</span>
                          </div>
                          <span className="text-xs text-purple-400 font-mono">{step.progress}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${step.color} rounded-full animate-progress-bar relative`}
                            style={{ 
                              animationDelay: `${i * 0.5}s`,
                              width: `${step.progress}%`
                            }}
                          >
                            <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
                          </div>
                        </div>
                      </div>
                      {/* Enhanced floating particles */}
                      <div className="absolute -right-3 top-1/2 w-3 h-3 bg-purple-400 rounded-full animate-float-right shadow-lg shadow-purple-400/50"></div>
                      <div className="absolute -right-5 top-1/3 w-2 h-2 bg-pink-400 rounded-full animate-float-right" style={{ animationDelay: '0.3s' }}></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Arrow 2: Processing to Deployment */}
              <div className="hidden md:block absolute left-[59%] top-[42%] w-[15%] z-20">
                <svg width="100%" height="40" viewBox="0 0 200 40" className="overflow-visible">
                  <defs>
                    <linearGradient id="arrowGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                  {/* Dashed line */}
                  <line 
                    x1="0" y1="20" x2="180" y2="20" 
                    stroke="url(#arrowGrad2)" 
                    strokeWidth="2.5" 
                    strokeDasharray="6 4"
                    className="animate-dash-flow"
                    style={{ animationDelay: '0.5s' }}
                  />
                  {/* Arrow head */}
                  <polygon 
                    points="180,20 170,15 170,25" 
                    fill="#06b6d4"
                  />
                  {/* Animated dots */}
                  <circle r="3" fill="#8b5cf6" className="animate-dot-travel">
                    <animate attributeName="cx" from="0" to="180" dur="2s" begin="0.3s" repeatCount="indefinite" />
                    <animate attributeName="cy" from="20" to="20" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0;1;1;0" dur="2s" begin="0.3s" repeatCount="indefinite" />
                  </circle>
                  <circle r="3" fill="#a78bfa" className="animate-dot-travel">
                    <animate attributeName="cx" from="0" to="180" dur="2s" begin="0.8s" repeatCount="indefinite" />
                    <animate attributeName="cy" from="20" to="20" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0;1;1;0" dur="2s" begin="0.8s" repeatCount="indefinite" />
                  </circle>
                </svg>
              </div>

              {/* Destination: Server Cluster - Enhanced */}
              <div className="flex flex-col items-center space-y-6">
                <div className="text-cyan-400 text-xs font-bold tracking-wider mb-2 uppercase">Deployment</div>
                <div className="grid grid-cols-2 gap-4 w-full">
                  {[
                    { name: 'AWS', icon: '☁️', color: 'from-orange-500/20 to-yellow-500/20', border: 'orange-500/40', glow: 'orange-500/30', gpu: 72, mem: 58 },
                    { name: 'GCP', icon: '🌐', color: 'from-blue-500/20 to-cyan-500/20', border: 'blue-500/40', glow: 'blue-500/30', gpu: 65, mem: 48 },
                    { name: 'Azure', icon: '⚡', color: 'from-cyan-500/20 to-blue-500/20', border: 'cyan-500/40', glow: 'cyan-500/30', gpu: 80, mem: 62 },
                    { name: 'Local', icon: '💻', color: 'from-green-500/20 to-emerald-500/20', border: 'green-500/40', glow: 'green-500/30', gpu: 45, mem: 38 },
                  ].map((server, i) => (
                    <div 
                      key={i}
                      className="relative group animate-scale-in"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    >
                      {/* Glow effect */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${server.color} rounded-2xl blur-lg opacity-50 group-hover:opacity-100 transition-opacity`}></div>
                      
                      <div className={`relative bg-gradient-to-br ${server.color} border-2 border-${server.border} rounded-2xl p-5 backdrop-blur-sm hover:scale-105 transition-all cursor-pointer shadow-xl`}>
                        <div className="text-4xl mb-2 animate-bounce-subtle">{server.icon}</div>
                        <div className="text-white text-sm font-bold mb-3">{server.name}</div>
                        
                        {/* Enhanced activity indicators */}
                        <div className="absolute top-3 right-3 flex space-x-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-blink shadow-lg shadow-green-400/50"></div>
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-blink shadow-lg shadow-green-400/50" style={{ animationDelay: '0.3s' }}></div>
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-blink shadow-lg shadow-green-400/50" style={{ animationDelay: '0.6s' }}></div>
                        </div>
                        
                        {/* Enhanced GPU/Memory bars with labels */}
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>GPU</span>
                              <span>{server.gpu}%</span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-cpu-usage relative"
                                style={{ width: `${server.gpu}%` }}
                              >
                                <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>MEM</span>
                              <span>{server.mem}%</span>
                            </div>
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-cpu-usage relative"
                                style={{ width: `${server.mem}%`, animationDelay: '0.5s' }}
                              >
                                <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/5">
                  <div className="text-gray-400 text-xs font-semibold">
                    <span className="text-green-400">4</span> Active Deployments
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced floating data packets */}
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute bg-blue-400 rounded-sm animate-data-packet shadow-lg shadow-blue-400/50"
                style={{
                  width: i % 3 === 0 ? '12px' : '8px',
                  height: i % 3 === 0 ? '12px' : '8px',
                  left: `${15 + i * 8}%`,
                  top: `${25 + (i % 4) * 15}%`,
                  animationDelay: `${i * 0.6}s`,
                  opacity: 0.7
                }}
              />
            ))}

            {/* Enhanced status indicators with icons */}
            <div className="relative mt-12 flex flex-wrap items-center justify-center gap-6 text-sm">
              <div className="flex items-center space-x-3 bg-slate-800/50 backdrop-blur-sm px-4 py-2 rounded-full border border-white/5">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                <span className="text-gray-300"><span className="text-white font-bold">3</span> Models Deploying</span>
              </div>
              <div className="flex items-center space-x-3 bg-slate-800/50 backdrop-blur-sm px-4 py-2 rounded-full border border-white/5">
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50"></div>
                <span className="text-gray-300"><span className="text-white font-bold">12</span> Active Endpoints</span>
              </div>
              <div className="flex items-center space-x-3 bg-slate-800/50 backdrop-blur-sm px-4 py-2 rounded-full border border-white/5">
                <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse shadow-lg shadow-purple-400/50"></div>
                <span className="text-gray-300"><span className="text-white font-bold">99.9%</span> Uptime</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="relative z-10 container mx-auto px-6 pb-32">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition transform hover:scale-105 hover:-translate-y-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4 animate-bounce-subtle">
              <span className="text-2xl">🔍</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Model Browser & Upload</h3>
            <p className="text-gray-400">Browse thousands of LLMs from Hugging Face or upload your own custom models.</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition transform hover:scale-105 hover:-translate-y-2 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4 animate-bounce-subtle" style={{ animationDelay: '0.5s' }}>
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Auto Optimization</h3>
            <p className="text-gray-400">Automatic quantization and vLLM compilation for peak performance.</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition transform hover:scale-105 hover:-translate-y-2 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-4 animate-bounce-subtle" style={{ animationDelay: '1s' }}>
              <span className="text-2xl">☁️</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Multi-Cloud Deploy</h3>
            <p className="text-gray-400">Deploy to AWS, GCP, or local infrastructure with real-time monitoring.</p>
          </div>
        </div>
      </div>

      {/* Sign In Modal */}
      {showSignIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowSignIn(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-6">Sign In</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Email</label>
                <input type="email" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Password</label>
                <input type="password" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" placeholder="••••••••" />
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition">
                Sign In
              </button>
            </form>
            <p className="text-gray-400 text-center mt-4">
              Don't have an account? <button onClick={() => { setShowSignIn(false); setShowSignUp(true); }} className="text-blue-400 hover:underline">Sign Up</button>
            </p>
          </div>
        </div>
      )}

      {/* Sign Up Modal */}
      {showSignUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowSignUp(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-white mb-6">Create Account</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Full Name</label>
                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Email</label>
                <input type="email" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Password</label>
                <input type="password" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" placeholder="••••••••" />
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition">
                Create Account
              </button>
            </form>
            <p className="text-gray-400 text-center mt-4">
              Already have an account? <button onClick={() => { setShowSignUp(false); setShowSignIn(true); }} className="text-blue-400 hover:underline">Sign In</button>
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
