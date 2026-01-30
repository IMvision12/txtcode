'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

export default function Home() {
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
      <nav className="relative z-10 container mx-auto px-6 py-4 flex items-center justify-between">
        <Logo />
        
        <div className="hidden md:flex items-center space-x-8 text-gray-300">
          <Link href="#features" className="hover:text-white transition">Features</Link>
          <Link href="#pricing" className="hover:text-white transition">Pricing</Link>
          <Link href="#docs" className="hover:text-white transition">Docs</Link>
          <Link href="#about" className="hover:text-white transition">About</Link>
        </div>

        <div className="flex items-center space-x-4">
          <Link 
            href="/signin"
            className="text-white hover:text-gray-300 transition px-4 py-2"
          >
            Sign In
          </Link>
          <Link 
            href="/signup"
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-6 pt-12 pb-32">
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
            <Link 
              href="/signup"
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-2xl hover:shadow-blue-500/50 transition transform hover:scale-105 animate-bounce-subtle"
            >
              Get Started Free
            </Link>
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
            
            <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-0 md:gap-0 items-center">
              
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

              {/* Arrow 1: Source to Processing - 2 arrows */}
              <div className="hidden md:flex items-center justify-center px-4">
                <svg width="120" height="120" viewBox="0 0 120 120" className="overflow-visible">
                  <defs>
                    <linearGradient id="arrowGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="50%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                    <filter id="glow1">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  
                  {/* First arrow - top curved */}
                  <path 
                    d="M 15 40 Q 40 20, 70 30 T 105 35" 
                    stroke="url(#arrowGrad1)" 
                    strokeWidth="6" 
                    strokeOpacity="0.3"
                    fill="none"
                    filter="url(#glow1)"
                  />
                  <path 
                    d="M 15 40 Q 40 20, 70 30 T 105 35" 
                    stroke="url(#arrowGrad1)" 
                    strokeWidth="3" 
                    strokeDasharray="8 5"
                    strokeLinecap="round"
                    fill="none"
                    className="animate-dash-flow"
                  />
                  <polygon 
                    points="110,35 100,30 100,40" 
                    fill="#a78bfa"
                    filter="url(#glow1)"
                  />
                  
                  {/* Second arrow - bottom curved */}
                  <path 
                    d="M 15 80 Q 40 100, 70 90 T 105 85" 
                    stroke="url(#arrowGrad1)" 
                    strokeWidth="6" 
                    strokeOpacity="0.3"
                    fill="none"
                    filter="url(#glow1)"
                  />
                  <path 
                    d="M 15 80 Q 40 100, 70 90 T 105 85" 
                    stroke="url(#arrowGrad1)" 
                    strokeWidth="3" 
                    strokeDasharray="8 5"
                    strokeLinecap="round"
                    fill="none"
                    className="animate-dash-flow"
                    style={{ animationDelay: '0.5s' }}
                  />
                  <polygon 
                    points="110,85 100,80 100,90" 
                    fill="#a78bfa"
                    filter="url(#glow1)"
                  />
                  
                  {/* Animated dots on first arrow */}
                  <circle r="4" fill="#60a5fa" filter="url(#glow1)">
                    <animateMotion dur="2s" repeatCount="indefinite" path="M 15 40 Q 40 20, 70 30 T 105 35" />
                    <animate attributeName="opacity" values="0;1;1;0" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle r="4" fill="#8b5cf6" filter="url(#glow1)">
                    <animateMotion dur="2s" begin="0.7s" repeatCount="indefinite" path="M 15 40 Q 40 20, 70 30 T 105 35" />
                    <animate attributeName="opacity" values="0;1;1;0" dur="2s" begin="0.7s" repeatCount="indefinite" />
                  </circle>
                  
                  {/* Animated dots on second arrow */}
                  <circle r="4" fill="#60a5fa" filter="url(#glow1)">
                    <animateMotion dur="2s" begin="0.3s" repeatCount="indefinite" path="M 15 80 Q 40 100, 70 90 T 105 85" />
                    <animate attributeName="opacity" values="0;1;1;0" dur="2s" begin="0.3s" repeatCount="indefinite" />
                  </circle>
                  <circle r="4" fill="#8b5cf6" filter="url(#glow1)">
                    <animateMotion dur="2s" begin="1s" repeatCount="indefinite" path="M 15 80 Q 40 100, 70 90 T 105 85" />
                    <animate attributeName="opacity" values="0;1;1;0" dur="2s" begin="1s" repeatCount="indefinite" />
                  </circle>
                </svg>
              </div>

              {/* Processing: Optimization Pipeline - Enhanced */}
              <div className="flex flex-col items-center space-y-6">
                <div className="text-purple-400 text-xs font-bold tracking-wider mb-2 uppercase flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  Processing
                </div>
                <div className="space-y-4 w-full">
                  <div className="relative group">
                    <div 
                      className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-6 backdrop-blur-sm animate-slide-in-right hover:border-purple-400/50 transition-all shadow-lg hover:shadow-purple-500/20"
                    >
                      <div className="mb-4">
                        <h4 className="text-white text-base font-bold mb-1">Inference Engines</h4>
                        <p className="text-purple-200 text-sm font-medium">
                          vLLM • TGI • TensorRT • SGLang
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <div className="text-purple-300 text-xs font-semibold mb-1">QUANTIZATION</div>
                          <div className="text-gray-200 text-sm">
                            INT4 • INT8 • FP8 • GPTQ • AWQ
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-purple-300 text-xs font-semibold mb-1">FEATURES</div>
                          <div className="text-gray-200 text-sm">
                            Paged Attention • Flash Attention
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Enhanced floating particles */}
                    <div className="absolute -right-3 top-1/2 w-3 h-3 bg-purple-400 rounded-full animate-float-right shadow-lg shadow-purple-400/50"></div>
                    <div className="absolute -right-5 top-1/3 w-2 h-2 bg-pink-400 rounded-full animate-float-right" style={{ animationDelay: '0.3s' }}></div>
                  </div>
                </div>
              </div>

              {/* Arrow 2: Processing to Deployment - 2 arrows */}
              <div className="hidden md:flex items-center justify-center px-4">
                <svg width="120" height="120" viewBox="0 0 120 120" className="overflow-visible">
                  <defs>
                    <linearGradient id="arrowGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="50%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                    <filter id="glow2">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  
                  {/* First arrow - top curved */}
                  <path 
                    d="M 15 40 Q 40 20, 70 30 T 105 35" 
                    stroke="url(#arrowGrad2)" 
                    strokeWidth="6" 
                    strokeOpacity="0.3"
                    fill="none"
                    filter="url(#glow2)"
                  />
                  <path 
                    d="M 15 40 Q 40 20, 70 30 T 105 35" 
                    stroke="url(#arrowGrad2)" 
                    strokeWidth="3" 
                    strokeDasharray="8 5"
                    strokeLinecap="round"
                    fill="none"
                    className="animate-dash-flow"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <polygon 
                    points="110,35 100,30 100,40" 
                    fill="#22d3ee"
                    filter="url(#glow2)"
                  />
                  
                  {/* Second arrow - bottom curved */}
                  <path 
                    d="M 15 80 Q 40 100, 70 90 T 105 85" 
                    stroke="url(#arrowGrad2)" 
                    strokeWidth="6" 
                    strokeOpacity="0.3"
                    fill="none"
                    filter="url(#glow2)"
                  />
                  <path 
                    d="M 15 80 Q 40 100, 70 90 T 105 85" 
                    stroke="url(#arrowGrad2)" 
                    strokeWidth="3" 
                    strokeDasharray="8 5"
                    strokeLinecap="round"
                    fill="none"
                    className="animate-dash-flow"
                    style={{ animationDelay: '0.7s' }}
                  />
                  <polygon 
                    points="110,85 100,80 100,90" 
                    fill="#22d3ee"
                    filter="url(#glow2)"
                  />
                  
                  {/* Animated dots on first arrow */}
                  <circle r="4" fill="#a78bfa" filter="url(#glow2)">
                    <animateMotion dur="2s" begin="0.2s" repeatCount="indefinite" path="M 15 40 Q 40 20, 70 30 T 105 35" />
                    <animate attributeName="opacity" values="0;1;1;0" dur="2s" begin="0.2s" repeatCount="indefinite" />
                  </circle>
                  <circle r="4" fill="#06b6d4" filter="url(#glow2)">
                    <animateMotion dur="2s" begin="0.9s" repeatCount="indefinite" path="M 15 40 Q 40 20, 70 30 T 105 35" />
                    <animate attributeName="opacity" values="0;1;1;0" dur="2s" begin="0.9s" repeatCount="indefinite" />
                  </circle>
                  
                  {/* Animated dots on second arrow */}
                  <circle r="4" fill="#a78bfa" filter="url(#glow2)">
                    <animateMotion dur="2s" begin="0.5s" repeatCount="indefinite" path="M 15 80 Q 40 100, 70 90 T 105 85" />
                    <animate attributeName="opacity" values="0;1;1;0" dur="2s" begin="0.5s" repeatCount="indefinite" />
                  </circle>
                  <circle r="4" fill="#06b6d4" filter="url(#glow2)">
                    <animateMotion dur="2s" begin="1.2s" repeatCount="indefinite" path="M 15 80 Q 40 100, 70 90 T 105 85" />
                    <animate attributeName="opacity" values="0;1;1;0" dur="2s" begin="1.2s" repeatCount="indefinite" />
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
    </main>
  );
}
