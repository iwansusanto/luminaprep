import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  FileText,
  Brain,
  BarChart3,
  Zap,
  ChevronRight
} from 'lucide-react'
import heroImage from '@/assets/hero-ai.png'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#09090B] font-sans">
      {/* Structured Grid Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, #E4E4E7 1px, transparent 1px),
            linear-gradient(to bottom, #E4E4E7 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
          opacity: 0.4
        }}></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-[#E4E4E7] bg-[#FAFAFA]/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <img src="https://res.cloudinary.com/dfwutfkbn/image/upload/v1778865007/c53281de-f18c-45fa-ae3d-bdd4cbb95e85.png" alt="LuminaPrep Logo" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-lg font-semibold tracking-tight text-[#09090B]">
              LuminaPrep
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#71717A]">
            <Link to="/login" className="hover:text-[#09090B] transition-colors">Sign in</Link>
            <Link to="/login" className="bg-[#09090B] text-white px-5 py-2 rounded-lg hover:bg-[#18181B] transition-colors">
              Get Started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-screen flex items-center pt-16">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <motion.div
                className="flex-1 max-w-2xl"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAFAFA] border border-[#E4E4E7] text-[#71717A] text-xs font-mono mb-6">
                  <span className="w-2 h-2 bg-[#0066FF] rounded-full"></span>
                  Free to Use
                </div>
                <h1 className="text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1] text-[#09090B]">
                  Turn Complex Documents into <br />
                  <span className="text-[#0066FF]">High-Fidelity Study Suites.</span>
                </h1>
                <p className="text-lg text-[#71717A] mb-8 leading-relaxed max-w-xl">
                  LuminaPrep leverages context-aware RAG to ingest dense learning materials, instantly generating adaptive active-recall evaluations. Built for high-achievers who value depth.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Link to="/login" className="group bg-[#09090B] text-white px-6 py-3 rounded-lg font-medium text-sm hover:bg-[#18181B] transition-colors flex items-center gap-2">
                    Get Started Free
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <a href="https://github.com/iwansusanto/luminaprep" target="_blank" rel="noreferrer" className="text-sm text-[#71717A] hover:text-[#09090B] transition-colors">
                    View Documentation →
                  </a>
                </div>
              </motion.div>

              <motion.div
                className="flex-1 relative w-full max-w-xl"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <div className="relative rounded-xl overflow-hidden border border-[#E4E4E7] bg-white shadow-sm">
                  <img
                    src={heroImage}
                    alt="LuminaPrep Interface"
                    className="w-full h-auto"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section - Bento Grid */}
        <section id="features" className="py-32 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4 text-[#09090B]">
                Infrastructure for Advanced Learning
              </h2>
              <p className="text-[#71717A]">
                Purpose-built components that transform static content into interactive learning experiences.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {/* RAG Ingestion Card */}
              <motion.div
                className="col-span-2 bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl p-6 hover:border-[#0066FF] hover:shadow-sm transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 bg-white border border-[#E4E4E7] rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-[#09090B]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#09090B] mb-1">RAG-Powered Ingestion</h3>
                    <p className="text-sm text-[#71717A]">Context-aware document processing with vector embeddings</p>
                  </div>
                </div>
                {/* UI Snippet */}
                <div className="bg-white border border-[#E4E4E7] rounded-lg p-4 font-mono text-xs">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-[#E4E4E7]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#E4E4E7]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#E4E4E7]"></div>
                  </div>
                  <div className="space-y-2 text-[#71717A]">
                    <div className="flex items-center gap-2">
                      <span className="text-[#0066FF]">→</span>
                      <span>lecture_notes.pdf</span>
                      <span className="text-[#0066FF] ml-auto">processing...</span>
                    </div>
                    <div className="h-1 bg-[#E4E4E7] rounded overflow-hidden">
                      <div className="h-full bg-[#0066FF] w-3/4 animate-pulse"></div>
                    </div>
                    <div className="text-[10px] text-[#71717A]">Vector embeddings generated: 1,247 chunks</div>
                  </div>
                </div>
              </motion.div>

              {/* Quiz Generation Card */}
              <motion.div
                className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl p-6 hover:border-[#0066FF] hover:shadow-sm transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 bg-white border border-[#E4E4E7] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Brain className="w-5 h-5 text-[#09090B]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#09090B] mb-1">Adaptive Quizzes</h3>
                    <p className="text-sm text-[#71717A]">AI-generated assessments with difficulty calibration</p>
                  </div>
                </div>
                {/* UI Snippet */}
                <div className="bg-white border border-[#E4E4E7] rounded-lg p-4">
                  <div className="text-xs font-mono text-[#71717A] mb-3">
                    <span className="text-[#09090B]">Q:</span> What is the primary function...
                  </div>
                  <div className="space-y-2">
                    {['A. To process data', 'B. To store information', 'C. To analyze patterns'].map((opt, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-mono text-[#71717A] p-2 rounded hover:bg-[#FAFAFA] cursor-pointer">
                        <span className="text-[#0066FF]">{opt[0]}</span>
                        <span>{opt.slice(3)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Analytics Card */}
              <motion.div
                className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl p-6 hover:border-[#0066FF] hover:shadow-sm transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 bg-white border border-[#E4E4E7] rounded-lg flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-5 h-5 text-[#09090B]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#09090B] mb-1">Progress Analytics</h3>
                    <p className="text-sm text-[#71717A]">Real-time performance tracking and insights</p>
                  </div>
                </div>
                {/* UI Snippet */}
                <div className="bg-white border border-[#E4E4E7] rounded-lg p-4">
                  <div className="flex items-end gap-1 h-16 mb-2">
                    {[40, 65, 45, 80, 55, 90, 75].map((h, i) => (
                      <div key={i} className="flex-1 bg-[#0066FF] rounded-sm" style={{ height: `${h}%`, opacity: 0.6 + (i * 0.06) }}></div>
                    ))}
                  </div>
                  <div className="text-xs font-mono text-[#71717A]">
                    <span className="text-[#0066FF]">▲</span> 23% improvement this week
                  </div>
                </div>
              </motion.div>

              {/* Performance Card */}
              <motion.div
                className="col-span-2 bg-[#FAFAFA] border border-[#E4E4E7] rounded-xl p-6 hover:border-[#0066FF] hover:shadow-sm transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                viewport={{ once: true }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 bg-white border border-[#E4E4E7] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-[#09090B]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#09090B] mb-1">Performance Optimization</h3>
                    <p className="text-sm text-[#71717A]">Sub-second response times with edge deployment</p>
                  </div>
                </div>
                {/* UI Snippet */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Ingestion', value: '0.8s' },
                    { label: 'Quiz Gen', value: '1.2s' },
                    { label: 'Analytics', value: '0.3s' }
                  ].map((metric, i) => (
                    <div key={i} className="bg-white border border-[#E4E4E7] rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-[#09090B] font-mono">{metric.value}</div>
                      <div className="text-xs text-[#71717A]">{metric.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-32 bg-[#FAFAFA]">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4 text-[#09090B]">
                Workflow
              </h2>
              <p className="text-[#71717A]">
                Three-step process from document to mastery.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              {[
                {
                  step: '01',
                  title: 'Upload Materials',
                  description: 'Drag and drop PDFs, slides, or any learning documents. Our RAG pipeline processes and indexes content automatically.'
                },
                {
                  step: '02',
                  title: 'Generate Assessments',
                  description: 'AI creates personalized quizzes based on your materials, calibrated to your current knowledge level.'
                },
                {
                  step: '03',
                  title: 'Track Progress',
                  description: 'Monitor your learning trajectory with detailed analytics and adaptive recommendations.'
                }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  className="flex gap-6 py-8 border-b border-[#E4E4E7] last:border-0"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-white border border-[#E4E4E7] rounded-lg flex items-center justify-center font-mono text-sm text-[#71717A]">
                    {item.step}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[#09090B] mb-2">{item.title}</h3>
                    <p className="text-[#71717A]">{item.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#E4E4E7] flex-shrink-0" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 bg-white border-t border-[#E4E4E7]">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="max-w-2xl mx-auto"
            >
              <h2 className="text-3xl font-bold tracking-tight mb-4 text-[#09090B]">
                Get Started Free
              </h2>
              <p className="text-[#71717A] mb-8">
                Transform your learning materials into interactive study suites. No credit card required.
              </p>
              <Link to="/login" className="inline-flex items-center gap-2 bg-[#09090B] text-white px-6 py-3 rounded-lg font-medium text-sm hover:bg-[#18181B] transition-colors">
                Start Learning
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-[#E4E4E7] bg-[#FAFAFA]">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-2">
                <img src="https://res.cloudinary.com/dfwutfkbn/image/upload/v1778865007/c53281de-f18c-45fa-ae3d-bdd4cbb95e85.png" alt="LuminaPrep Logo" className="w-6 h-6 rounded object-cover" />
                <span className="text-sm font-semibold text-[#09090B]">LuminaPrep</span>
              </div>
              <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#71717A]">
                <a href="#features" className="hover:text-[#09090B] transition-colors">Features</a>
                <a href="#how-it-works" className="hover:text-[#09090B] transition-colors">How it Works</a>
                <a href="https://github.com/iwansusanto/luminaprep" target="_blank" rel="noreferrer" className="hover:text-[#09090B] transition-colors">GitHub</a>
                <Link to="/login" className="bg-[#09090B] text-white px-5 py-2 rounded-lg hover:bg-[#18181B] transition-colors">
                  Get Started
                </Link>
              </div>
              <p className="text-sm text-[#71717A]">
                2026 LuminaPrep Inc.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
