'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Home() {

  return (
    <main className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Mesh Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#0a0a0f]"></div>
        
        {/* Animated Gradient Orbs */}
        <div className="absolute top-0 -left-40 w-[500px] h-[500px] bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-0 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-cyan-600/20 to-teal-600/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-1/2 w-[500px] h-[500px] bg-gradient-to-br from-indigo-600/20 to-blue-600/20 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
        
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
        
        {/* Radial Gradient Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,10,15,0.8)_100%)]"></div>
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
            <Link href="#features" className="hover:text-cyan-400 transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-cyan-400 transition-colors">Pricing</Link>
            <Link href="#docs" className="hover:text-cyan-400 transition-colors">Docs</Link>
            <Link href="#community" className="hover:text-cyan-400 transition-colors">Community</Link>
          </div>

          <div className="flex items-center space-x-3">
            <Link 
              href="/signin"
              className="text-gray-300 hover:text-white transition-colors px-3 py-1.5 text-sm font-medium"
            >
              Sign In
            </Link>
            <Link 
              href="/signup"
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-4 py-1.5 rounded-lg transition-all text-sm font-semibold shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-cyan-500/60 transform hover:scale-105"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-6 pt-16 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-full px-6 py-2 mb-8 backdrop-blur-xl">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="text-sm font-medium bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Deploy LLMs in seconds, not hours
              </span>
            </div>

            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight">
              <span className="bg-gradient-to-r from-white via-blue-200 to-cyan-200 bg-clip-text text-transparent">
                Deploy LLMs to
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent animate-gradient">
                production in minutes
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Browse Hugging Face models, optimize with vLLM, SGLang or TensorRT,
              and deploy to AWS, GCP, or your own infrastructure.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link 
                href="/signup"
                className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold text-lg shadow-2xl shadow-blue-500/50 hover:shadow-cyan-500/70 transform hover:scale-105 transition-all overflow-hidden"
              >
                <span className="relative z-10">Start deploying free</span>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Link>
              <Link 
                href="#demo"
                className="px-8 py-4 backdrop-blur-xl bg-white/5 border-2 border-white/10 hover:border-cyan-500/50 text-white rounded-xl font-semibold text-lg transition-all hover:bg-white/10"
              >
                Watch demo
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-gray-400">10,000+ models supported</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-gray-400">Deploy in &lt;5 minutes</span>
              </div>
            </div>
          </div>

          {/* Deployment Pipeline Visualization */}
          <div className="relative w-full mx-auto">
            <div className="relative backdrop-blur-2xl bg-gradient-to-br from-blue-900/20 via-cyan-900/20 to-blue-900/20 border-2 border-blue-500/20 rounded-3xl p-8 md:p-16 overflow-hidden shadow-2xl">
              {/* Animated Grid background */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.1)_1px,transparent_1px)] bg-[size:40px_40px] animate-pulse"></div>
              
              {/* Glow Effects */}
              <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl"></div>

              {/* Three Column Layout with Arrows */}
              <div className="relative flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6">
                
                {/* SOURCE Section */}
                <div className="flex flex-col items-center space-y-6 flex-shrink-0">
                  <div className="text-blue-400 text-xs font-bold tracking-wider uppercase mb-2">Source</div>
                  
                  {/* Hugging Face Card */}
                  <div className="relative group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/40 to-cyan-500/40 rounded-3xl blur-2xl group-hover:blur-3xl transition-all"></div>
                    <div className="relative w-48 h-48 bg-gradient-to-br from-blue-600/30 to-cyan-600/30 backdrop-blur-xl rounded-3xl border-2 border-blue-400/30 flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:border-blue-400/50 transition-all">
                      <div className="text-9xl group-hover:scale-110 transition-transform">🤗</div>
                    </div>
                    {/* Status indicator */}
                    <div className="absolute -top-3 -right-3">
                      <div className="w-10 h-10 bg-green-400 rounded-full animate-ping absolute"></div>
                      <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full relative flex items-center justify-center shadow-lg shadow-green-400/50">
                        <span className="text-white text-sm font-bold">✓</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-white font-bold text-xl bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Hugging Face</div>
                  
                  {/* Upload Option */}
                  <div className="relative w-full mt-4">
                    <div className="text-gray-400 text-xs text-center mb-3 font-medium">OR</div>
                    <div className="backdrop-blur-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-2 border-dashed border-cyan-400/30 rounded-2xl p-5 hover:border-cyan-400/60 hover:bg-cyan-500/20 transition-all cursor-pointer group">
                      <div className="flex flex-col items-center space-y-3">
                        <div className="text-4xl group-hover:scale-110 transition-transform">📤</div>
                        <div className="text-cyan-400 text-sm font-bold">Upload Model</div>
                        <div className="text-gray-400 text-xs">Custom models supported</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Arrow 1 */}
                <div className="hidden md:flex items-center justify-center flex-shrink-0 w-24">
                  <svg width="100%" height="80" viewBox="0 0 100 80" preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <linearGradient id="blueArrow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="1"/>
                        <stop offset="100%" stopColor="#60a5fa" stopOpacity="1"/>
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    {/* Simple solid arrow */}
                    <path d="M 5 35 L 5 45 L 75 45 L 75 50 L 95 40 L 75 30 L 75 35 Z" fill="url(#blueArrow)" filter="url(#glow)"/>
                  </svg>
                </div>

                {/* PROCESSING Section */}
                <div className="flex flex-col items-center space-y-6 flex-shrink-0">
                  <div className="text-cyan-400 text-xs font-bold tracking-wider uppercase mb-2">Processing</div>
                  
                  <div className="w-full max-w-[280px]">
                    {/* Single Optimization Card */}
                    <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/20 via-cyan-500/20 to-teal-500/20 border-2 border-cyan-400/30 rounded-2xl p-6 hover:border-cyan-400/60 hover:scale-105 transition-all group cursor-pointer shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-3xl group-hover:scale-110 transition-transform">⚡</span>
                          <span className="text-white text-base font-bold">Optimization</span>
                        </div>
                        <span className="text-xs text-cyan-300 font-mono font-bold">Ready</span>
                      </div>
                      
                      {/* Inference Engines */}
                      <div className="mb-4">
                        <div className="text-gray-400 text-xs font-semibold mb-2">Inference Engines:</div>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-blue-500/30 border border-blue-400/40 rounded text-xs text-blue-200 font-medium">vLLM</span>
                          <span className="px-2 py-1 bg-cyan-500/30 border border-cyan-400/40 rounded text-xs text-cyan-200 font-medium">SGLang</span>
                          <span className="px-2 py-1 bg-teal-500/30 border border-teal-400/40 rounded text-xs text-teal-200 font-medium">TensorRT</span>
                        </div>
                      </div>
                      
                      {/* Quantization Methods */}
                      <div>
                        <div className="text-gray-400 text-xs font-semibold mb-2">Quantization:</div>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-purple-500/30 border border-purple-400/40 rounded text-xs text-purple-200 font-medium">GPTQ</span>
                          <span className="px-2 py-1 bg-pink-500/30 border border-pink-400/40 rounded text-xs text-pink-200 font-medium">AWQ</span>
                          <span className="px-2 py-1 bg-indigo-500/30 border border-indigo-400/40 rounded text-xs text-indigo-200 font-medium">INT8</span>
                          <span className="px-2 py-1 bg-violet-500/30 border border-violet-400/40 rounded text-xs text-violet-200 font-medium">INT4</span>
                          <span className="px-2 py-1 bg-blue-500/30 border border-blue-400/40 rounded text-xs text-blue-200 font-medium">FP8</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Arrow 2 */}
                <div className="hidden md:flex items-center justify-center flex-shrink-0 w-24">
                  <svg width="100%" height="80" viewBox="0 0 100 80" preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <linearGradient id="cyanArrow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="1"/>
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity="1"/>
                      </linearGradient>
                      <filter id="glow2">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    {/* Simple solid arrow */}
                    <path d="M 5 35 L 5 45 L 75 45 L 75 50 L 95 40 L 75 30 L 75 35 Z" fill="url(#cyanArrow)" filter="url(#glow2)"/>
                  </svg>
                </div>

                {/* DEPLOYMENT Section */}
                <div className="flex flex-col items-center space-y-6">
                  <div className="text-cyan-400 text-xs font-bold tracking-wider uppercase mb-2">Deployment</div>
                  
                  <div className="grid grid-cols-2 gap-3 w-full">
                    {/* AWS */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-2xl blur-lg opacity-50"></div>
                      <div className="relative bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border-2 border-orange-500/40 rounded-2xl p-4 backdrop-blur-sm hover:scale-105 transition-all">
                        <div className="mb-2">
                          <Image src="/aws.png" alt="AWS" width={32} height={32} className="object-contain" />
                        </div>
                        <div className="text-white text-xs font-bold mb-2">AWS</div>
                        <div className="absolute top-2 right-2 flex space-x-1">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-blink"></div>
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-blink" style={{ animationDelay: '0.3s' }}></div>
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-blink" style={{ animationDelay: '0.6s' }}></div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>GPU</span><span>72%</span>
                          </div>
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-green-400 rounded-full" style={{ width: '72%' }}></div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>MEM</span><span>58%</span>
                          </div>
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width: '58%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* GCP */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl blur-lg opacity-50"></div>
                      <div className="relative bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-2 border-blue-500/40 rounded-2xl p-4 backdrop-blur-sm hover:scale-105 transition-all">
                        <div className="mb-2">
                          <Image src="/gcp.png" alt="GCP" width={32} height={32} className="object-contain" />
                        </div>
                        <div className="text-white text-xs font-bold mb-2">GCP</div>
                        <div className="absolute top-2 right-2 flex space-x-1">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-blink"></div>
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-blink" style={{ animationDelay: '0.3s' }}></div>
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-blink" style={{ animationDelay: '0.6s' }}></div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>GPU</span><span>65%</span>
                          </div>
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-green-400 rounded-full" style={{ width: '65%' }}></div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>MEM</span><span>48%</span>
                          </div>
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width: '48%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Azure */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl blur-lg opacity-50"></div>
                      <div className="relative bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500/40 rounded-2xl p-4 backdrop-blur-sm hover:scale-105 transition-all">
                        <div className="mb-2">
                          <Image src="/asure.png" alt="Azure" width={32} height={32} className="object-contain" />
                        </div>
                        <div className="text-white text-xs font-bold mb-2">Azure</div>
                        <div className="absolute top-2 right-2 flex space-x-1">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-blink"></div>
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-blink" style={{ animationDelay: '0.3s' }}></div>
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-blink" style={{ animationDelay: '0.6s' }}></div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>GPU</span><span>80%</span>
                          </div>
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-green-400 rounded-full" style={{ width: '80%' }}></div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>MEM</span><span>62%</span>
                          </div>
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width: '62%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Self-Hosted */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl blur-lg opacity-50"></div>
                      <div className="relative bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/40 rounded-2xl p-4 backdrop-blur-sm hover:scale-105 transition-all">
                        <div className="mb-2">
                          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" fill="#10B981"/>
                          </svg>
                        </div>
                        <div className="text-white text-xs font-bold mb-2">Self-Hosted</div>
                        <div className="absolute top-2 right-2 flex space-x-1">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-blink"></div>
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-blink" style={{ animationDelay: '0.3s' }}></div>
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-blink" style={{ animationDelay: '0.6s' }}></div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>GPU</span><span>45%</span>
                          </div>
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-green-400 rounded-full" style={{ width: '45%' }}></div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>MEM</span><span>38%</span>
                          </div>
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width: '38%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-gray-400 text-xs mt-2">4 Active Deployments</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section 1 */}
      <div className="relative z-10 container mx-auto px-6 py-24">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              From model selection<br />to production endpoint
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed">
              Complete LLM deployment pipeline with model browsing, inference optimization, 
              and multi-cloud deployment - all in one platform.
            </p>
          </div>

          <div className="space-y-8">
            <div className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group cursor-pointer">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition-all">
                  <span className="text-2xl">🔍</span>
                </div>
                <h3 className="text-white text-xl font-bold group-hover:text-blue-400 transition-colors">Browse 10,000+ models</h3>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Search and filter Hugging Face models by task, size, and performance. 
                Preview model cards and select the perfect model for your use case.
              </p>
            </div>

            <div className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all group cursor-pointer">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center group-hover:bg-cyan-500/30 transition-all">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="text-white text-xl font-bold group-hover:text-cyan-400 transition-colors">Advanced inference optimization</h3>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Choose from vLLM, TensorRT-LLM, TGI, or SGLang engines. Apply INT4, INT8, 
                FP8, GPTQ, or AWQ quantization for optimal performance.
              </p>
            </div>

            <div className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:border-teal-500/50 hover:bg-teal-500/5 transition-all group cursor-pointer">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center group-hover:bg-cyan-500/30 transition-all">
                  <span className="text-2xl">☁️</span>
                </div>
                <h3 className="text-white text-xl font-bold group-hover:text-cyan-400 transition-colors">Deploy anywhere</h3>
              </div>
              <p className="text-gray-400 leading-relaxed">
                One-click deployment to AWS, Google Cloud, Azure, or your own GPU infrastructure. 
                Automatic scaling and load balancing included.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section 2 - Tons of features */}
      <div className="relative z-10 container mx-auto px-6 py-24">
        <div className="max-w-6xl mx-auto text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Everything you need to deploy LLMs
          </h2>
          <p className="text-gray-400 text-xl max-w-3xl mx-auto">
            From model selection to monitoring, we handle the entire deployment lifecycle.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {[
            { 
              icon: (
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              ), 
              title: 'Model browser', 
              desc: 'Search and filter 10,000+ models from Hugging Face. Preview model cards and performance metrics.',
              color: 'blue'
            },
            { 
              icon: (
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              ), 
              title: 'Inference engines', 
              desc: 'Choose from vLLM, TensorRT-LLM, Text Generation Inference, or SGLang for optimal performance.',
              color: 'cyan'
            },
            { 
              icon: (
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="6"/>
                  <circle cx="12" cy="12" r="2"/>
                </svg>
              ), 
              title: 'Quantization', 
              desc: 'Apply INT4, INT8, FP8, GPTQ, or AWQ quantization to reduce memory and increase throughput.',
              color: 'teal'
            },
            { 
              icon: (
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
                </svg>
              ), 
              title: 'Multi-cloud deploy', 
              desc: 'Deploy to AWS, Google Cloud, Azure, or your own GPU servers with one click.',
              color: 'cyan'
            },
            { 
              icon: (
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18"/>
                  <path d="m19 9-5 5-4-4-3 3"/>
                </svg>
              ), 
              title: 'Real-time monitoring', 
              desc: 'Track latency, throughput, GPU utilization, and costs in real-time dashboards.',
              color: 'green'
            },
            { 
              icon: (
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="7.5 4.21 12 6.81 16.5 4.21"/>
                  <polyline points="7.5 19.79 7.5 14.6 3 12"/>
                  <polyline points="21 12 16.5 14.6 16.5 19.79"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              ), 
              title: 'Auto-scaling', 
              desc: 'Automatically scale replicas based on request volume and response time targets.',
              color: 'orange'
            },
            { 
              icon: (
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              ), 
              title: 'Secure endpoints', 
              desc: 'API keys, rate limiting, and request logging built-in for production security.',
              color: 'red'
            },
            { 
              icon: (
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m3 11 18-5v12L3 14v-3z"/>
                  <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
                </svg>
              ), 
              title: 'OpenAI compatible', 
              desc: 'Drop-in replacement for OpenAI API with streaming support and function calling.',
              color: 'teal'
            },
            { 
              icon: (
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              ), 
              title: 'Cost tracking', 
              desc: 'Monitor GPU hours, inference costs, and optimize spending across deployments.',
              color: 'yellow'
            },
          ].map((feature, i) => {
            const colorClasses = {
              blue: 'hover:border-blue-500/50 hover:bg-blue-500/5 group-hover:bg-blue-500/20 group-hover:text-blue-400',
              cyan: 'hover:border-cyan-500/50 hover:bg-cyan-500/5 group-hover:bg-cyan-500/20 group-hover:text-cyan-400',
              teal: 'hover:border-teal-500/50 hover:bg-teal-500/5 group-hover:bg-teal-500/20 group-hover:text-teal-400',
              green: 'hover:border-green-500/50 hover:bg-green-500/5 group-hover:bg-green-500/20 group-hover:text-green-400',
              orange: 'hover:border-orange-500/50 hover:bg-orange-500/5 group-hover:bg-orange-500/20 group-hover:text-orange-400',
              red: 'hover:border-red-500/50 hover:bg-red-500/5 group-hover:bg-red-500/20 group-hover:text-red-400',
              yellow: 'hover:border-yellow-500/50 hover:bg-yellow-500/5 group-hover:bg-yellow-500/20 group-hover:text-yellow-400',
            };
            
            return (
              <div 
                key={i}
                className={`bg-black/40 backdrop-blur-sm border border-gray-800 rounded-xl p-8 transition-all group cursor-pointer transform hover:scale-105 ${colorClasses[feature.color as keyof typeof colorClasses].split(' ')[0]} ${colorClasses[feature.color as keyof typeof colorClasses].split(' ')[1]}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={`w-16 h-16 bg-black border-2 border-white/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-all text-white ${colorClasses[feature.color as keyof typeof colorClasses].split(' ')[2]}`}>
                  {feature.icon}
                </div>
                <h3 className={`text-white text-xl font-bold mb-3 transition-colors ${colorClasses[feature.color as keyof typeof colorClasses].split(' ')[3]}`}>{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            );
          })} 
        
        </div>
      </div>

      {/* Deployment Options Section */}
      <div className="relative z-10 container mx-auto px-6 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="inline-block bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full text-sm font-semibold mb-8">
            Flexible Deployment
          </div>
          
          <div className="grid md:grid-cols-2 gap-16 items-center mb-20">
            <div>
              <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Cloud or on-premise.<br />Your choice.
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                Deploy to major cloud providers with managed GPU instances, or bring your own 
                infrastructure for complete control and data privacy.
              </p>
            </div>

            <div className="relative">
              <div className="relative bg-black/40 backdrop-blur-sm border-2 border-blue-500/30 rounded-2xl p-12 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
                <div className="relative flex items-center justify-center">
                  <div className="w-64 h-48 border-4 border-blue-500 rounded-lg flex items-center justify-center bg-black/60">
                    <div className="text-6xl text-blue-400 animate-pulse-slow">☁️</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { logo: '/aws.png', title: 'AWS deployment', desc: 'Deploy to EC2 GPU instances with automatic AMI selection and security group configuration.', size: 56 },
              { logo: '/gcp.png', title: 'Google Cloud', desc: 'Launch on GCP Compute Engine with optimized machine types for LLM inference workloads.', size: 56 },
              { logo: '/asure.png', title: 'Azure support', desc: 'Deploy to Azure VMs with GPU acceleration and integrated monitoring.', size: 40 },
              { 
                icon: (
                  <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" fill="white"/>
                  </svg>
                ), 
                title: 'Self-hosted', 
                desc: 'Connect your own GPU servers and deploy models to your private infrastructure.',
                size: 40
              },
            ].map((feature, i) => (
              <div 
                key={i}
                className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:border-blue-500/50 transition-all"
              >
                <div className="w-16 h-16 bg-black border-2 border-white/20 rounded-xl flex items-center justify-center mb-4 text-white">
                  {feature.logo ? (
                    <Image src={feature.logo} alt={feature.title} width={feature.size} height={feature.size} className="object-contain" />
                  ) : (
                    feature.icon
                  )}
                </div>
                <h3 className="text-white text-lg font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 container mx-auto px-6 py-32">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Ready to deploy your first LLM?
          </h2>
          <p className="text-gray-400 text-xl mb-12">
            Start with our free tier. No credit card required.
          </p>
          <Link 
            href="/signup"
            className="inline-block px-10 py-5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg font-bold transition-all text-xl shadow-lg shadow-blue-500/50 hover:shadow-cyan-500/60"
          >
            Get started free
          </Link>
        </div>
      </div>
    </main>
  );
}
