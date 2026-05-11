import { Link, createFileRoute } from '@tanstack/react-router'
import { useAuth } from '../../context/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import {
  FileText,
  CheckCircle2,
  Trophy,
  MoreVertical,
  Sparkles,
  ArrowUpRight,
  Clock,
  Zap,
  ChevronRight,
  BookOpen
} from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
import { Segmented, Select, ConfigProvider, theme, Skeleton, Empty, Button, Modal } from 'antd'
import { MaterialUploader } from '../../components/dashboard/MaterialUploader'
import { OnboardingModal } from '../../components/dashboard/OnboardingModal'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardIndexPage,
})

interface Material {
  id: string;
  file_name: string;
  storage_path: string;
  file_type: string;
  file_size: number | null;
  citations: string | null;
  project_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

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
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null)
  const [quizSettings, setQuizSettings] = useState({
    questions: 20,
    complexity: 'intermediate'
  })
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false)

  const projectId = auth?.user?.projects?.[0]?.id

  const fetchMaterials = useCallback(async () => {
    if (!projectId) return;
    setLoading(true)
    try {
      const response = await fetch(`/api/v1/materials/project/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setMaterials(Array.isArray(data.materials) ? data.materials : [])
      }
    } catch (error) {
      console.error('Failed to fetch materials:', error)
      setMaterials([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchMaterials()
  }, [fetchMaterials])

  const handleGenerateQuiz = async () => {
    if (!selectedMaterial) {
      alert('Please select a material first.')
      return
    }
    // Logic for quiz generation would go here
    alert(`Generating ${quizSettings.questions} ${quizSettings.complexity} questions for material ID: ${selectedMaterial}`)
  }

  const showOnboarding = !!(auth?.user && auth.user.projects?.length === 0);

  const stats = [
    { label: 'Materials', value: (materials?.length || 0).toString(), sub: 'Total items', icon: FileText, color: 'bg-indigo-50 text-indigo-600', trend: '+2 this week' },
    { label: 'Quizzes', value: '24', sub: 'Completed', icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600', trend: '92% avg score' },
    { label: 'Learning Streak', value: '7', sub: 'Days active', icon: Trophy, color: 'bg-amber-50 text-amber-600', trend: 'Personal best' },
  ]

  return (
    <>
      <OnboardingModal isVisible={showOnboarding} />
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-12 pb-20"
      >
        {/* Hero & Quick Actions */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <motion.div variants={item} className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Intelligence Synchronized
            </div>
            <h1 className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[0.9] mb-6">
              Elevate your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600">
                Lumina Experience.
              </span>
            </h1>
            <p className="text-slate-500 text-lg font-medium leading-relaxed max-w-lg">
              Welcome back, {auth?.user?.full_name?.split(' ')[0] || 'Explorer'}. Your personal knowledge vault is ready for new insights.
            </p>
          </motion.div>

          <motion.div variants={item} className="flex gap-4">
            {stats.slice(0, 1).map((stat) => (
              <div key={stat.label} className="bg-white/50 backdrop-blur-md p-6 rounded-[2rem] border border-slate-200/60 shadow-sm min-w-[240px]">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 ${stat.color} rounded-2xl flex items-center justify-center shadow-sm`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-800">{stat.value}</span>
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md">{stat.trend}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Main Grid: Upload & Generator */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-8">
            <motion.div variants={item} className="bg-white rounded-[2.5rem] border border-slate-200/60 p-10 shadow-sm spotlight-card">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Knowledge Vault</h3>
                  <p className="text-sm text-slate-500 font-medium">Your curated study collection.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsUploadModalVisible(true)}
                    className="px-5 py-2.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 group"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Add Material
                  </button>
                  <Link to="/dashboard/materials" className="px-5 py-2.5 bg-slate-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-50 transition-all border border-slate-200/50 flex items-center gap-2 group">
                    Full Library
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>

              <div className="space-y-4">
                {loading ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border border-slate-100 rounded-[1.5rem]">
                      <Skeleton.Avatar active size={56} shape="square" className="rounded-2xl" />
                      <div className="flex-1">
                        <Skeleton active paragraph={{ rows: 1 }} />
                      </div>
                    </div>
                  ))
                ) : materials.length > 0 ? (
                  materials.slice(0, 3).map((material) => (
                    <div key={material.id} className="flex items-center justify-between p-4 hover:bg-slate-50/80 border border-transparent hover:border-slate-200/50 rounded-[1.5rem] transition-all group cursor-pointer">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 leading-none mb-2">{material.file_name}</p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(material.created_at).toLocaleDateString()}</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                            <span>PDF Document</span>
                          </div>
                        </div>
                      </div>
                      <button className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                      <BookOpen className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px] mb-6">Your vault is currently empty</p>
                    <button
                      onClick={() => setIsUploadModalVisible(true)}
                      className="px-8 py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-100 transition-all flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Add Your First Material
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          <motion.div variants={item} className="lg:col-span-5 bg-slate-900 rounded-[3rem] p-12 shadow-2xl shadow-indigo-900/40 flex flex-col relative overflow-hidden group border border-white/10 noise-bg">
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/40 rotate-3 group-hover:rotate-6 transition-transform">
                  <Zap className="w-8 h-8 text-white fill-current" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white leading-none mb-2">Quiz Architect</h3>
                  <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.3em]">AI Engine v2.4</p>
                </div>
              </div>

              <p className="text-slate-400 font-medium mb-10 leading-relaxed text-sm">
                Transform your static materials into dynamic assessments using our neural processing engine.
              </p>

              <ConfigProvider
                theme={{
                  algorithm: theme.darkAlgorithm,
                  token: {
                    colorPrimary: '#818cf8',
                    borderRadius: 20,
                    colorBgContainer: 'rgba(30, 41, 59, 0.5)',
                    colorBorder: 'rgba(255, 255, 255, 0.1)',
                  },
                  components: {
                    Select: {
                      controlHeight: 64,
                      optionSelectedBg: 'rgba(129, 140, 248, 0.2)',
                      colorBgElevated: '#0f172a',
                    },
                    Segmented: {
                      controlHeight: 56,
                      itemSelectedBg: '#6366f1',
                    }
                  }
                }}
              >
                <div className="space-y-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-indigo-300/60 uppercase tracking-[0.25em] block px-1">Select Source Material</label>
                    <Select
                      className="w-full"
                      placeholder="Choose a material..."
                      options={materials.map(m => ({ value: m.id, label: m.file_name }))}
                      onChange={(val) => setSelectedMaterial(val)}
                      suffixIcon={<BookOpen className="w-4 h-4 opacity-40" />}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-indigo-300/60 uppercase tracking-[0.25em] block px-1">Count</label>
                      <Segmented
                        block
                        options={[10, 20, 50]}
                        value={quizSettings.questions}
                        onChange={(val) => setQuizSettings(prev => ({ ...prev, questions: val as number }))}
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-indigo-300/60 uppercase tracking-[0.25em] block px-1">Level</label>
                      <Select
                        className="w-full"
                        value={quizSettings.complexity}
                        onChange={(val) => setQuizSettings(prev => ({ ...prev, complexity: val }))}
                        options={[
                          { value: 'foundational', label: 'Basic' },
                          { value: 'intermediate', label: 'Mid' },
                          { value: 'mastery', label: 'Pro' },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </ConfigProvider>

              <button
                onClick={handleGenerateQuiz}
                disabled={!selectedMaterial}
                className="w-full mt-12 py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-600/30 active:scale-[0.97] group/gen disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                Initialize Generation
              </button>
            </div>
          </motion.div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.slice(1).map((stat) => (
            <motion.div
              key={stat.label}
              variants={item}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group relative overflow-hidden spotlight-card"
            >
              <div className="flex flex-col gap-6">
                <div className={`w-14 h-14 ${stat.color} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-6 shadow-sm`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{stat.label}</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-black text-slate-800">{stat.value}</span>
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">{stat.trend}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          <motion.div variants={item} className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 group-hover:scale-110 transition-transform">
              <Trophy className="w-32 h-32" />
            </div>
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-black mb-2">Mastery Challenge</h3>
                <p className="text-indigo-100/70 text-xs font-medium leading-relaxed max-w-[200px]">
                  Synthesize knowledge from your entire vault.
                </p>
              </div>
              <button className="mt-6 bg-white text-indigo-600 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all active:scale-95 self-start">
                Start Final <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#6366f1',
            borderRadius: 24,
          },
        }}
      >
        <Modal
          open={isUploadModalVisible}
          onCancel={() => setIsUploadModalVisible(false)}
          footer={null}
          width={800}
          centered
          styles={{
            mask: {
              backdropFilter: 'blur(12px)',
              background: 'rgba(15, 23, 42, 0.4)',
            },
          }}
          modalRender={(node) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative overflow-hidden rounded-[3rem] bg-white border border-white/50 shadow-2xl"
            >
              {node}
            </motion.div>
          )}
        >
          <div className="p-2">
            <MaterialUploader
              projectId={projectId}
              onUploadSuccess={() => {
                fetchMaterials()
                setIsUploadModalVisible(false)
              }}
              className="bg-transparent border-none shadow-none p-0"
            />
          </div>
        </Modal>
      </ConfigProvider>
    </>
  )
}
