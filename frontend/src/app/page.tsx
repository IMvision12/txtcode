'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';

export default function Home() {

  return (
    <main className="min-h-screen bg-[#0f0f0f] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0f0f0f]"></div>

      {/* Navigation */}
      <nav className="relative z-10 container mx-auto px-6 py-5 flex items-center justify-between">
        <Logo />
        
        <div className="hidden md:flex items-center space-x-8 text-gray-400 text-sm">
          <Link href="#features" className="hover:text-white transition">Features</Link>
          <Link href="#pricing" className="hover:text-white transition">Pricing</Link>
          <Link href="#docs" className="hover:text-white transition">Docs</Link>
          <Link href="#community" className="hover:text-white transition">Community</Link>
        </div>

        <div className="flex items-center space-x-3">
          <Link 
            href="/signin"
            className="text-gray-400 hover:text-white transition px-4 py-2 text-sm"
          >
            Sign In
          </Link>
          <Link 
            href="/signup"
            className="bg-[#46C8BC] hover:bg-[#3db5aa] text-black px-6 py-2.5 rounded-lg transition text-sm font-semibold"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-6 pt-20 pb-32">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-8 leading-tight">
              Deploy LLMs to<br />production in minutes
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
              Browse Hugging Face models, optimize with vLLM or TensorRT,<br />
              and deploy to AWS, GCP, or your own infrastructure.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link 
                href="/signup"
                className="px-8 py-4 bg-[#46C8BC] hover:bg-[#3db5aa] text-black rounded-lg font-semibold transition-all text-lg"
              >
                Start deploying free
              </Link>
              <Link 
                href="#demo"
                className="px-8 py-4 border-2 border-gray-700 hover:border-[#46C8BC] text-white rounded-lg font-semibold transition-all text-lg"
              >
                Watch demo
              </Link>
            </div>
          </div>

          {/* Deployment Pipeline Visualization */}
          <div className="relative max-w-7xl mx-auto">
            <div className="relative bg-gradient-to-br from-slate-900/80 to-blue-900/40 backdrop-blur-xl border-2 border-gray-800 rounded-2xl p-12 md:p-16 overflow-visible min-h-[550px]">
              {/* Grid background */}
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: 'linear-gradient(rgba(70, 200, 188, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(70, 200, 188, 0.3) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }}></div>

              {/* Three Column Layout */}
              <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
                
                {/* SOURCE Section */}
                <div className="flex flex-col items-center space-y-6">
                  <div className="text-blue-400 text-xs font-bold tracking-wider uppercase mb-2">Source</div>
                  
                  {/* Hugging Face Card */}
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-3xl blur-xl"></div>
                    <div className="relative w-44 h-44 bg-gradient-to-br from-blue-600/40 to-purple-600/40 rounded-3xl border-2 border-blue-500/40 flex items-center justify-center backdrop-blur-sm shadow-xl">
                      <div className="text-8xl">🤗</div>
                    </div>
                    {/* Status indicator */}
                    <div className="absolute -top-3 -right-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full animate-ping absolute"></div>
                      <div className="w-8 h-8 bg-green-500 rounded-full relative flex items-center justify-center">
                        <span className="text-white text-xs font-bold">✓</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-white font-bold text-lg">Hugging Face</div>
                  
                  {/* Upload Option */}
                  <div className="relative w-full mt-4">
                    <div className="text-gray-500 text-xs text-center mb-2">OR</div>
                    <div className="bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border-2 border-dashed border-teal-500/30 rounded-xl p-4 backdrop-blur-sm hover:border-teal-500/50 transition-all cursor-pointer">
                      <div className="flex flex-col items-center space-y-2">
                        <div className="text-3xl">📤</div>
                        <div className="text-teal-400 text-sm font-semibold">Upload Model</div>
                        <div className="text-gray-500 text-xs">Custom models supported</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Arrow 1: Source to Processing */}
                <div className="hidden md:block absolute left-[29%] top-[35%] w-[13%] z-20">
                  <svg width="100%" height="40" viewBox="0 0 150 40">
                    <line x1="0" y1="20" x2="130" y2="20" stroke="rgba(59, 130, 246, 0.5)" strokeWidth="2" strokeDasharray="6 4" className="animate-dash-flow"/>
                    <polygon points="130,20 120,15 120,25" fill="rgba(59, 130, 246, 0.5)"/>
                    <circle r="3" fill="#3b82f6">
                      <animate attributeName="cx" from="0" to="130" dur="2s" repeatCount="indefinite"/>
                      <animate attributeName="cy" from="20" to="20" dur="2s" repeatCount="indefinite"/>
                      <animate attributeName="opacity" values="0;1;1;0" dur="2s" repeatCount="indefinite"/>
                    </circle>
                  </svg>
                </div>

                {/* PROCESSING Section */}
                <div className="flex flex-col items-center space-y-6">
                  <div className="text-purple-400 text-xs font-bold tracking-wider uppercase mb-2">Processing</div>
                  
                  <div className="space-y-4 w-full">
                    {/* Quantization */}
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-4 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">🔢</span>
                          <span className="text-white text-sm font-semibold">Quantization</span>
                        </div>
                        <span className="text-xs text-purple-400 font-mono">85%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: '85%' }}>
                          <div className="h-full bg-white/30 animate-shimmer"></div>
                        </div>
                      </div>
                    </div>

                    {/* vLLM Compile */}
                    <div className="bg-gradient-to-r from-pink-500/10 to-orange-500/10 border border-pink-500/30 rounded-2xl p-4 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xl">⚡</span>
                          <span className="text-white text-sm font-semibold">vLLM Compile</span>
                        </div>
                        <span className="text-xs text-pink-400 font-mono">92%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-pink-500 to-orange-500 rounded-full" style={{ width: '92%' }}>
                          <div className="h-full bg-white/30 animate-shimmer"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Arrow 2: Processing to Deployment */}
                <div className="hidden md:block absolute left-[62%] top-[35%] w-[13%] z-20">
                  <svg width="100%" height="40" viewBox="0 0 150 40">
                    <line x1="0" y1="20" x2="130" y2="20" stroke="rgba(168, 85, 247, 0.5)" strokeWidth="2" strokeDasharray="6 4" className="animate-dash-flow"/>
                    <polygon points="130,20 120,15 120,25" fill="rgba(168, 85, 247, 0.5)"/>
                    <circle r="3" fill="#a855f7">
                      <animate attributeName="cx" from="0" to="130" dur="2s" begin="0.5s" repeatCount="indefinite"/>
                      <animate attributeName="cy" from="20" to="20" dur="2s" repeatCount="indefinite"/>
                      <animate attributeName="opacity" values="0;1;1;0" dur="2s" begin="0.5s" repeatCount="indefinite"/>
                    </circle>
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
                        <div className="text-3xl mb-2">☁️</div>
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
                        <div className="text-3xl mb-2">🌐</div>
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
                        <div className="text-3xl mb-2">⚡</div>
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

                    {/* Local */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl blur-lg opacity-50"></div>
                      <div className="relative bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/40 rounded-2xl p-4 backdrop-blur-sm hover:scale-105 transition-all">
                        <div className="text-3xl mb-2">💻</div>
                        <div className="text-white text-xs font-bold mb-2">Local</div>
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

              {/* Status indicators at bottom */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-gray-400"><span className="text-white font-bold">3</span> Models Deploying</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-gray-400"><span className="text-white font-bold">12</span> Active Endpoints</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                  <span className="text-gray-400"><span className="text-white font-bold">99.9%</span> Uptime</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Partner Logos */}
      <div className="relative z-10 container mx-auto px-6 py-16 border-t border-gray-800">
        <div className="flex flex-wrap items-center justify-center gap-12 opacity-40 grayscale">
          <div className="text-2xl font-bold text-gray-600">NVIDIA</div>
          <div className="text-2xl font-bold text-gray-600">AWS</div>
          <div className="text-2xl font-bold text-gray-600">Google Cloud</div>
          <div className="text-2xl font-bold text-gray-600">Azure</div>
          <div className="text-2xl font-bold text-gray-600">Hugging Face</div>
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
            <div className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:border-[#46C8BC]/50 transition-all">
              <h3 className="text-white text-xl font-bold mb-3">Browse 10,000+ models</h3>
              <p className="text-gray-400 leading-relaxed">
                Search and filter Hugging Face models by task, size, and performance. 
                Preview model cards and select the perfect model for your use case.
              </p>
            </div>

            <div className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:border-[#46C8BC]/50 transition-all">
              <h3 className="text-white text-xl font-bold mb-3">Advanced inference optimization</h3>
              <p className="text-gray-400 leading-relaxed">
                Choose from vLLM, TensorRT-LLM, TGI, or SGLang engines. Apply INT4, INT8, 
                FP8, GPTQ, or AWQ quantization for optimal performance.
              </p>
            </div>

            <div className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:border-[#46C8BC]/50 transition-all">
              <h3 className="text-white text-xl font-bold mb-3">Deploy anywhere</h3>
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
            { icon: '�', title: 'Model browser', desc: 'Search and filter 10,000+ models from Hugging Face. Preview model cards and performance metrics.' },
            { icon: '⚡', title: 'Inference engines', desc: 'Choose from vLLM, TensorRT-LLM, Text Generation Inference, or SGLang for optimal performance.' },
            { icon: '🎯', title: 'Quantization', desc: 'Apply INT4, INT8, FP8, GPTQ, or AWQ quantization to reduce memory and increase throughput.' },
            { icon: '☁️', title: 'Multi-cloud deploy', desc: 'Deploy to AWS, Google Cloud, Azure, or your own GPU servers with one click.' },
            { icon: '�', title: 'Real-time monitoring', desc: 'Track latency, throughput, GPU utilization, and costs in real-time dashboards.' },
            { icon: '�', title: 'Auto-scaling', desc: 'Automatically scale replicas based on request volume and response time targets.' },
            { icon: '🔐', title: 'Secure endpoints', desc: 'API keys, rate limiting, and request logging built-in for production security.' },
            { icon: '📡', title: 'OpenAI compatible', desc: 'Drop-in replacement for OpenAI API with streaming support and function calling.' },
            { icon: '�', title: 'Cost tracking', desc: 'Monitor GPU hours, inference costs, and optimize spending across deployments.' },
          ].map((feature, i) => (
            <div 
              key={i}
              className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-xl p-8 hover:border-[#46C8BC]/50 transition-all group animate-fade-in"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{feature.icon}</div>
              <h3 className="text-white text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Deployment Options Section */}
      <div className="relative z-10 container mx-auto px-6 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="inline-block bg-[#46C8BC]/10 text-[#46C8BC] px-4 py-2 rounded-full text-sm font-semibold mb-8">
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
              <div className="relative bg-black/40 backdrop-blur-sm border-2 border-[#46C8BC]/30 rounded-2xl p-12 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#46C8BC]/5 to-transparent"></div>
                <div className="relative flex items-center justify-center">
                  <div className="w-64 h-48 border-4 border-[#46C8BC] rounded-lg flex items-center justify-center bg-black/60">
                    <div className="text-6xl text-[#46C8BC] animate-pulse-slow">☁️</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: '☁️', title: 'AWS deployment', desc: 'Deploy to EC2 GPU instances with automatic AMI selection and security group configuration.' },
              { icon: '�', title: 'Google Cloud', desc: 'Launch on GCP Compute Engine with optimized machine types for LLM inference workloads.' },
              { icon: '⚡', title: 'Azure support', desc: 'Deploy to Azure VMs with GPU acceleration and integrated monitoring.' },
              { icon: '�️', title: 'Self-hosted', desc: 'Connect your own GPU servers and deploy models to your private infrastructure.' },
            ].map((feature, i) => (
              <div 
                key={i}
                className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:border-[#46C8BC]/50 transition-all"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-white text-lg font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link 
              href="/signup"
              className="inline-block px-8 py-4 bg-[#46C8BC] hover:bg-[#3db5aa] text-black rounded-lg font-semibold transition-all text-lg"
            >
              Start deploying now
            </Link>
          </div>
        </div>
      </div>

      {/* Monitoring & Management Section */}
      <div className="relative z-10 container mx-auto px-6 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="inline-block bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full text-sm font-semibold mb-8">
            Monitoring & Management
          </div>
          
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Monitor performance<br />in real-time
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                Track latency, throughput, GPU utilization, and costs across all your deployments. 
                Get alerts when performance degrades or costs spike.
              </p>
              <Link 
                href="/signup"
                className="inline-block px-8 py-4 bg-[#46C8BC] hover:bg-[#3db5aa] text-black rounded-lg font-semibold transition-all"
              >
                View monitoring demo
              </Link>
            </div>

            <div className="relative">
              <div className="relative bg-black/40 backdrop-blur-sm border-2 border-blue-500/30 rounded-2xl p-12 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
                <div className="relative flex items-center justify-center">
                  <div className="w-80 h-56 border-4 border-blue-500 rounded-lg flex items-center justify-center bg-black/60 relative">
                    <div className="text-6xl text-blue-400 animate-pulse-slow">📊</div>
                    {/* Corner brackets */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400"></div>
                  </div>
                </div>
              </div>
            </div>
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
            className="inline-block px-10 py-5 bg-[#46C8BC] hover:bg-[#3db5aa] text-black rounded-lg font-bold transition-all text-xl"
          >
            Get started free
          </Link>
        </div>
      </div>
    </main>
  );
}
