import { Link, createFileRoute } from '@tanstack/react-router'
import { useAuth } from '../../context/AuthContext'
import {
  FileText,
  CheckCircle2,
  Trophy,
  MoreVertical,
  Sparkles,
  ArrowUpRight,
  Clock,
  Zap
} from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
import { Segmented, Select, ConfigProvider, theme } from 'antd'
import { MaterialUploader } from '../../components/dashboard/MaterialUploader'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardIndexPage,
})

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
}

function DashboardIndexPage() {
  const auth = useAuth()

  const stats = [
    { label: 'Materials', value: '12', sub: 'Total items', icon: FileText, color: 'bg-indigo-50 text-indigo-600', trend: '+2 this week' },
    { label: 'Quizzes', value: '24', sub: 'Completed', icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600', trend: '92% avg score' },
    { label: 'Learning Streak', value: '7', sub: 'Days active', icon: Trophy, color: 'bg-amber-50 text-amber-600', trend: 'Personal best' },
  ]

  const recentMaterials = [
    { name: 'Advanced Organic Chemistry.pdf', date: '2h ago', pages: '42 pages', category: 'Chemistry', iconColor: 'text-indigo-500', bgColor: 'bg-indigo-50' },
    { name: 'Linear Algebra Concepts.docx', date: 'Yesterday', pages: '12 pages', category: 'Math', iconColor: 'text-blue-500', bgColor: 'bg-blue-50' },
    { name: 'World History: Part II.pptx', date: '2 days ago', pages: '64 slides', category: 'History', iconColor: 'text-orange-500', bgColor: 'bg-orange-50' },
  ]

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-10 pb-20"
    >
      {/* Welcome & Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
        <motion.div variants={item} className="lg:col-span-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[10px] font-black uppercase tracking-widest mb-4">
            <Sparkles className="w-3 h-3" />
            Learning Synchronized
          </div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none mb-4">
            Keep growing, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
              {auth?.user?.full_name?.split(' ')[0] || 'Explorer'}.
            </span>
          </h2>
          <p className="text-slate-500 text-sm font-medium max-w-sm leading-relaxed">
            Your personalized study path is ready. You've completed 65% of your weekly goal.
          </p>
        </motion.div>

        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={item}
              className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group relative overflow-hidden"
            >
              <div className="flex flex-col gap-4">
                <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-6`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-800">{stat.value}</span>
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md">{stat.trend}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Main Grid: Upload & Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <MaterialUploader variants={item} />

        <motion.div variants={item} className="bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl shadow-indigo-900/40 flex flex-col relative overflow-hidden group border border-white/5">
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
          <div className="absolute -top-20 -left-20 w-48 h-48 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Zap className="w-6 h-6 text-white fill-current" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white leading-none mb-1">Quiz Architect</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">AI Generation Engine</p>
              </div>
            </div>

            <p className="text-sm text-slate-400 font-medium mb-10 leading-relaxed max-w-[240px]">Design your assessment with precision using our latest model.</p>

            <ConfigProvider
              theme={{
                algorithm: theme.darkAlgorithm,
                token: {
                  colorPrimary: '#6366f1', // Vibrant Electric Indigo
                  borderRadius: 18,
                  colorBgContainer: 'rgba(15, 23, 42, 0.6)', // Deep Slate Glass
                  colorBorder: 'rgba(255, 255, 255, 0.08)',
                },
                components: {
                  Segmented: {
                    itemSelectedBg: '#6366f1',
                    itemSelectedColor: '#ffffff',
                    trackBg: 'rgba(255, 255, 255, 0.03)',
                    itemColor: '#94a3b8',
                    itemHoverColor: '#ffffff',
                  },
                  Select: {
                    controlHeight: 56,
                    optionSelectedBg: 'rgba(99, 102, 241, 0.15)',
                    optionSelectedColor: '#818cf8',
                    colorBgElevated: '#0f172a',
                  }
                }
              }}
            >
              <div className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-indigo-300/60 uppercase tracking-[0.2em] block px-1">Number of Questions</label>
                  <Segmented
                    block
                    size="large"
                    options={[10, 20, 50, 100]}
                    defaultValue={20}
                    className="p-1.5 rounded-[1.25rem] border border-white/5 backdrop-blur-md"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-indigo-300/60 uppercase tracking-[0.2em] block px-1">Target Complexity</label>
                  <Select
                    defaultValue="intermediate"
                    className="w-full h-14"
                    dropdownStyle={{ borderRadius: '1rem' }}
                    options={[
                      { value: 'foundational', label: 'Foundational' },
                      { value: 'intermediate', label: 'Intermediate' },
                      { value: 'mastery', label: 'Mastery' },
                    ]}
                  />
                </div>
              </div>
            </ConfigProvider>

            <button className="w-full mt-10 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/30 active:scale-95 group/gen">
              <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              Generate Assessment
            </button>
          </div>
        </motion.div>
      </div>

      {/* Lists Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div variants={item} className="bg-white rounded-[2.5rem] border border-slate-200/60 p-10 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-black text-slate-800">Recent Materials</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Processed by AI</p>
            </div>
            <button className="px-4 py-2 bg-slate-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-50 transition-colors border border-slate-200/50">
              View Collection
            </button>
          </div>

          <div className="space-y-3">
            {recentMaterials.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50/80 border border-transparent hover:border-slate-200/50 rounded-[1.5rem] transition-all group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 ${item.bgColor} ${item.iconColor} rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500`}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 leading-none mb-1.5">{item.name}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.date}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span>{item.pages}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1.5 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-lg">{item.category}</span>
                  <button className="p-2 text-slate-400 hover:text-slate-600 rounded-full transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={item} className="bg-gradient-to-br from-indigo-600 to-violet-800 rounded-[2.5rem] p-12 shadow-2xl shadow-indigo-600/20 text-white flex flex-col items-center justify-center text-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-[80px] group-hover:scale-125 transition-transform duration-1000" />

          <div className="w-24 h-24 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl relative z-10">
            <Trophy className="w-12 h-12 text-white" />
          </div>

          <div className="relative z-10">
            <h3 className="text-3xl font-black mb-4 leading-tight">Mastery Challenge</h3>
            <p className="text-indigo-100 text-sm font-medium mb-10 max-w-xs mx-auto leading-relaxed opacity-80">
              Ready to push your limits? Start a composite quiz based on your entire material library.
            </p>
            <Link
              to="/dashboard/quizzes/start/$uuid"
              params={{ uuid: 'final-challenge-mastery-uuid' }}
              className="bg-white text-indigo-600 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-indigo-50 transition-all shadow-2xl active:scale-95 group/btn"
            >
              Start Final Quiz
              <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Link>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
