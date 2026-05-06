import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import {
  BrainCircuit,
  Target,
  MessageSquare,
  Zap,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
  Star,
  CheckCircle2
} from 'lucide-react'
import heroImage from '@/assets/hero-ai.png'
import bgImage from '@/assets/bg-abstract.png'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-primary/30 relative font-sans">
      {/* Background Image Layer */}
      <div
        className="fixed inset-0 z-0 opacity-40 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgImage})` }}
      ></div>
      <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-b from-transparent via-[#020617]/50 to-[#020617]"></div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/[0.05] bg-[#020617]/60 backdrop-blur-2xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="LuminaPrep Logo" className="w-8 h-8 rounded-lg shadow-lg shadow-blue-600/20 object-cover" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              LuminaPrep
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className="text-slate-300 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-slate-300 hover:text-white transition-colors">How it Works</a>
            <a href="#metrics" className="text-slate-300 hover:text-white transition-colors">Metrics</a>
            <a href="https://github.com/iwansusanto/luminaprep" target="_blank" rel="noreferrer" className="text-slate-300 hover:text-white transition-colors flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-github"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.28 1.15-.28 2.35 0 3.5-.73 1.02-1.08 2.25-1 3.5 0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
              GitHub
            </a>
            <button className="bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 active:scale-95">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="pt-40 pb-20 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center gap-12 text-center lg:text-left">
              <motion.div
                className="flex-1"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  AI-Native Learning Platform
                </div>
                <h1 className="text-6xl lg:text-8xl font-black tracking-tight mb-6 leading-[1] text-white">
                  Master Your <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 animate-gradient">
                    Potential.
                  </span>
                </h1>
                <p className="text-xl text-slate-400 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  LuminaPrep redefines education through intelligent personalization. Experience a platform that learns how you learn.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-6 justify-center lg:justify-start">
                  <button className="group bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-500 transition-all shadow-2xl shadow-blue-600/40 flex items-center gap-2 active:scale-95">
                    Start Learning Now
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 overflow-hidden">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 20}`} alt="User" />
                        </div>
                      ))}
                    </div>
                    <div className="text-sm text-slate-400">
                      <span className="font-bold text-white">10k+</span> Students joined
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="flex-1 relative w-full max-w-2xl"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
              >
                <div className="relative z-10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(37,99,235,0.2)] border border-white/10 group">
                  <img
                    src={heroImage}
                    alt="LuminaPrep AI Interface"
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                </div>

                {/* Floating Glass Cards */}
                <motion.div
                  className="absolute -top-6 -left-6 bg-slate-900/60 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4 z-20"
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center">
                    <BrainCircuit className="text-indigo-400 w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">AI Optimizer</div>
                    <div className="font-bold text-sm">Path Synchronized</div>
                  </div>
                </motion.div>

                <motion.div
                  className="absolute -bottom-6 -right-6 bg-slate-900/60 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-4 z-20"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Target className="text-green-400 w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Mastery</div>
                    <div className="font-bold text-sm">94% Accuracy</div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-32">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl font-bold mb-6 text-white">Intelligent Infrastructure</h2>
              <p className="text-slate-400">Everything you need to master your future, powered by state-of-the-art AI models.</p>
            </div>

            <motion.div
              className="grid md:grid-cols-3 gap-6"
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
            >
              {[
                { title: "Personalized Pathways", desc: "Adaptive study plans that evolve with your progress.", icon: <Target className="text-blue-400" /> },
                { title: "AI Tutor Chat", desc: "24/7 instant guidance for complex concepts.", icon: <MessageSquare className="text-purple-400" /> },
                { title: "Smart Retention", desc: "Memory-optimized flashcards based on spaced repetition.", icon: <Zap className="text-yellow-400" /> },
                { title: "Live Analytics", desc: "Granular data insights into your learning velocity.", icon: <BarChart3 className="text-green-400" /> },
                { title: "Adaptive Assessment", desc: "Tests that find and bridge your specific knowledge gaps.", icon: <BrainCircuit className="text-pink-400" /> },
                { title: "Enterprise Security", desc: "Privacy-first architecture to keep your data safe.", icon: <ShieldCheck className="text-indigo-400" /> }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  className="group p-8 rounded-3xl bg-slate-900/40 backdrop-blur-md border border-white/5 hover:border-blue-500/30 transition-all duration-500 hover:bg-slate-800/40"
                  variants={fadeIn}
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-8 border border-white/5 group-hover:scale-110 group-hover:bg-blue-600/10 transition-all duration-500">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-white">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed text-sm">
                    {feature.desc}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Success Stories / Metrics */}
        <section id="metrics" className="py-20 relative">
          <div className="container mx-auto px-4">
            <div className="p-12 rounded-[2rem] bg-gradient-to-r from-blue-900/40 to-indigo-900/40 backdrop-blur-2xl border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-5">
                <BrainCircuit className="w-60 h-60 text-white" />
              </div>
              <div className="grid md:grid-cols-4 gap-12 text-center relative z-10">
                {[
                  { value: "45%", label: "Learning Boost" },
                  { value: "92%", label: "Pass Rate" },
                  { value: "10k+", label: "Daily Users" },
                  { value: "24/7", label: "AI Tutor" }
                ].map((metric, i) => (
                  <div key={i}>
                    <div className="text-5xl font-black text-white mb-2 tracking-tighter">{metric.value}</div>
                    <div className="text-xs text-blue-400 uppercase font-bold tracking-[0.2em]">{metric.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="max-w-4xl mx-auto p-16 rounded-[3rem] bg-white text-slate-950 relative shadow-[0_0_100px_rgba(255,255,255,0.1)]"
            >
              <h2 className="text-4xl md:text-6xl font-black mb-8 leading-[1.1]">Ready to Start Your <br /> AI Journey?</h2>
              <p className="text-lg mb-10 text-slate-600 max-w-2xl mx-auto">
                Join the next generation of learners mastering complex subjects through personalized intelligence. No commitment required.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <button className="w-full sm:w-auto bg-blue-600 text-white px-10 py-5 rounded-2xl font-bold text-xl hover:bg-blue-700 transition-all shadow-2xl active:scale-95">
                  Get Started Free
                </button>
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                  <CheckCircle2 className="text-green-500 w-5 h-5" />
                  No credit card required
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-16 border-t border-white/5 bg-slate-950/80 backdrop-blur-md">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div className="flex items-center gap-2">
                <img src="/logo.jpg" alt="LuminaPrep Logo" className="w-6 h-6 rounded-md object-cover" />
                <span className="text-xl font-bold text-white">LuminaPrep</span>
              </div>
              <div className="flex gap-10 text-sm font-medium text-slate-400">
                <a href="#" className="hover:text-white transition-colors">Privacy</a>
                <a href="#" className="hover:text-white transition-colors">Terms</a>
                <a href="#" className="hover:text-white transition-colors">Help</a>
              </div>
              <p className="text-sm text-slate-500">
                © 2026 LuminaPrep Inc. Future of Education.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
