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
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BrainCircuit className="text-primary-foreground w-5 h-5" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              LuminaPrep
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-primary transition-colors">How it Works</a>
            <a href="#metrics" className="hover:text-primary transition-colors">Metrics</a>
            <a href="https://github.com/iwansusanto/luminaprep" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-github"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.28 1.15-.28 2.35 0 3.5-.73 1.02-1.08 2.25-1 3.5 0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
              GitHub
            </a>

            <button className="bg-primary text-primary-foreground px-5 py-2 rounded-full hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <motion.div
              className="flex-1 text-center lg:text-left"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                AI-Native Learning Platform
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
                Master Any Subject with <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-500 to-indigo-600 animate-gradient">
                  Intelligence.
                </span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
                Experience the future of education. LuminaPrep uses advanced AI to create personalized pathways, intelligent assessments, and real-time tutoring tailored just for you.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <button className="group bg-primary text-primary-foreground px-8 py-4 rounded-xl font-bold text-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/25 flex items-center gap-2 active:scale-95">
                  Start Your Journey
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-muted overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="User" />
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-full border-2 border-background bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                    +10k
                  </div>
                </div>
                <div className="text-sm text-muted-foreground ml-2">
                  <span className="font-bold text-foreground">Trusted by 10,000+</span> students
                </div>
              </div>
            </motion.div>

            <motion.div
              className="flex-1 relative"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <img
                  src={heroImage}
                  alt="LuminaPrep AI Interface"
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 blur-[80px] rounded-full"></div>
              <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-purple-500/20 blur-[100px] rounded-full"></div>

              {/* Floating Card */}
              <motion.div
                className="absolute -bottom-6 -right-6 bg-card p-4 rounded-xl shadow-2xl border flex items-center gap-4 z-20"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                  <Target className="text-green-500 w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Mastery Level</div>
                  <div className="font-bold">94.2% Advanced</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why LuminaPrep?</h2>
            <p className="text-lg text-muted-foreground">
              Traditional learning is static. LuminaPrep is dynamic. We solve the one-size-fits-all problem with AI that adapts to your unique learning style.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              {[
                { title: "Static Materials", desc: "Traditional textbooks are outdated the moment they're printed.", icon: <Zap className="w-5 h-5 text-red-500" /> },
                { title: "One-Size-Fits-All", desc: "Generic lessons ignore your specific strengths and weaknesses.", icon: <Target className="w-5 h-5 text-red-500" /> },
                { title: "Limited Guidance", desc: "Teachers can't provide 24/7 personalized support to every student.", icon: <MessageSquare className="w-5 h-5 text-red-500" /> }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl border bg-card/50 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                  <div className="mt-1">{item.icon}</div>
                  <div>
                    <h4 className="font-bold">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="relative">
              <div className="p-8 rounded-2xl bg-primary text-primary-foreground shadow-2xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform duration-500">
                  <BrainCircuit className="w-40 h-40" />
                </div>
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6" />
                  The AI Advantage
                </h3>
                <div className="space-y-4">
                  <p className="text-primary-foreground/90 leading-relaxed">
                    "LuminaPrep's AI engine analyzes your performance in real-time, adjusting the difficulty and content of your study plan to keep you in the 'Goldilocks Zone' of learning—not too easy, not too hard."
                  </p>
                  <div className="pt-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                      <Star className="w-6 h-6 text-yellow-300" />
                    </div>
                    <div>
                      <div className="font-bold">Lumina AI v4.0</div>
                      <div className="text-xs opacity-70">Powering personalized education</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-4">Intelligent Features</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to master your exams, powered by the latest in machine learning.
            </p>
          </div>
          <motion.div
            className="grid md:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {[
              { title: "Personalized Pathways", desc: "Dynamic study plans that evolve based on your daily progress and goals.", icon: <Target className="text-blue-500" /> },
              { title: "AI Tutoring Chatbot", desc: "Ask questions 24/7 and get expert-level explanations instantly.", icon: <MessageSquare className="text-purple-500" /> },
              { title: "Smart Flashcards", desc: "Spaced repetition system that optimizes memory retention automatically.", icon: <Zap className="text-yellow-500" /> },
              { title: "Performance Analytics", desc: "Deep insights into your learning patterns and predicted outcomes.", icon: <BarChart3 className="text-green-500" /> },
              { title: "Intelligent Assessment", desc: "Practice exams that adapt to your level and identify critical gaps.", icon: <BrainCircuit className="text-pink-500" /> },
              { title: "Verified Security", desc: "Your data is protected by industry-leading encryption and privacy standards.", icon: <ShieldCheck className="text-indigo-500" /> }
            ].map((feature, i) => (
              <motion.div
                key={i}
                className="group p-8 rounded-2xl border bg-card hover:bg-muted/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                variants={fadeIn}
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
          <div className="grid grid-cols-12 h-full">
            {Array.from({ length: 144 }).map((_, i) => (
              <div key={i} className="border-[0.5px] border-white"></div>
            ))}
          </div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How it Works</h2>
            <p className="opacity-80">Three simple steps to academic excellence.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { step: "01", title: "Assessment", desc: "Take a 5-minute diagnostic test to identify your baseline knowledge." },
              { step: "02", title: "Generation", desc: "Our AI generates a custom roadmap tailored to your specific timeline." },
              { step: "03", title: "Optimization", desc: "Study with interactive tools that adapt as you improve." }
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-6xl font-black opacity-10 mb-4">{item.step}</div>
                <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                <p className="opacity-80 leading-relaxed">{item.desc}</p>
                {i < 2 && (
                  <div className="hidden lg:block absolute top-12 -right-6 text-white/20">
                    <ChevronRight className="w-12 h-12" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section id="metrics" className="py-24 border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "45%", label: "Faster Learning Rate" },
              { value: "92%", label: "Exam Pass Rate" },
              { value: "10k+", label: "Active Students" },
              { value: "24/7", label: "AI Support Availability" }
            ].map((metric, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl font-bold text-primary mb-2 tracking-tighter">{metric.value}</div>
                <div className="text-sm text-muted-foreground uppercase font-semibold tracking-wider">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-indigo-900 to-primary text-white text-center">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-8">Ready to illuminate your path?</h2>
            <p className="text-xl mb-10 opacity-90 max-w-2xl mx-auto leading-relaxed">
              Join thousands of students who are already using LuminaPrep to achieve their academic goals. Start your free trial today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button className="w-full sm:w-auto bg-white text-primary px-10 py-5 rounded-2xl font-bold text-xl hover:bg-white/90 transition-all shadow-2xl active:scale-95">
                Join LuminaPrep Free
              </button>
            </div>
            <p className="mt-8 text-sm opacity-60 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              No credit card required for free trial
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-background border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <BrainCircuit className="text-primary w-6 h-6" />
              <span className="text-xl font-bold">LuminaPrep</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 LuminaPrep Inc. Built with AI for the future.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
