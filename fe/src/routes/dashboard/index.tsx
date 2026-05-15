import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../../context/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '../../lib/api'
import {
  FileText,
  CheckCircle2,
  Sparkles,
  Zap,
  BookOpen,
  Loader2
} from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
import { Segmented, Select, ConfigProvider, theme, Modal, message, notification } from 'antd'
import { useRef } from 'react'
import { KnowledgeVault } from '../../components/dashboard/KnowledgeVault'
import { MaterialUploader } from '../../components/dashboard/MaterialUploader'
import { OnboardingModal } from '../../components/dashboard/OnboardingModal'
import { setting_quiz, setting_material } from '../../lib/utils'

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
  status: string;
  summary: string | null;
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
  const navigate = useNavigate()
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null)
  const [quizSettings, setQuizSettings] = useState({
    questions: 20,
    complexity: 'intermediate'
  })
  const [quizTopic, setQuizTopic] = useState('')
  const [quizCustomRequest, setQuizCustomRequest] = useState('')
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false)
  const [generating, setGenerating] = useState(false)
  const prevMaterialsRef = useRef<Material[]>([])

  const projectId = auth?.user?.projects?.[0]?.id

  const handleRemoveMaterial = async (id: string) => {
    Modal.confirm({
      title: 'Remove Material',
      content: 'Are you sure you want to remove this material? This action cannot be undone.',
      okText: 'Remove',
      okType: 'danger',
      cancelText: 'Cancel',
      centered: true,
      onOk: async () => {
        try {
          const response = await authFetch(`/api/v1/materials/${id}`, {
            method: 'DELETE',
          })
          if (response.ok) {
            setMaterials(prev => prev.filter(m => m.id !== id))
            message.success('Material removed successfully')
          } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || errorData.message || 'Failed to remove material')
          }
        } catch (error: any) {
          console.error('Failed to remove material:', error)
          message.error(error.message || 'Failed to remove material')
        }
      },
    })
  }

  const fetchMaterials = useCallback(async (silent = false) => {
    if (!projectId) return;
    if (!silent) setLoading(true)
    try {
      const response = await authFetch(`/api/v1/materials/project/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setMaterials(Array.isArray(data.materials) ? data.materials : [])
      }
    } catch (error) {
      console.error('Failed to fetch materials:', error)
      if (!silent) setMaterials([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchMaterials()
  }, [fetchMaterials])

  useEffect(() => {
    const hasProcessing = materials.some(m => m.status === 'processing');
    
    // Check for transitions from processing to completed
    materials.forEach(material => {
      const prevMaterial = prevMaterialsRef.current.find(m => m.id === material.id);
      if (prevMaterial && prevMaterial.status === 'processing' && material.status === 'completed') {
        notification.success({
          message: 'Analysis Complete',
          description: `"${material.file_name}" has been successfully processed and summarized.`,
          placement: 'bottomRight',
          icon: <Sparkles className="text-indigo-500" />,
          className: 'premium-notification'
        });
      }
    });
    
    prevMaterialsRef.current = materials;

    if (hasProcessing) {
      const interval = setInterval(() => fetchMaterials(true), 10000);
      return () => clearInterval(interval);
    }
  }, [fetchMaterials, materials])

  const handleGenerateQuiz = async () => {
    if (!selectedMaterial) {
      message.warning('Please select a material first.')
      return
    }

    setGenerating(true)
    try {
      const body: Record<string, unknown> = {
        question_count: quizSettings.questions,
        difficulty_level: quizSettings.complexity,
      }
      if (quizTopic.trim()) body.topic = quizTopic.trim()
      if (quizCustomRequest.trim()) body.custom_request = quizCustomRequest.trim()

      const response = await authFetch(`/api/v1/quizzes/materials/${selectedMaterial}/quizzes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        message.success('Quiz generation started successfully! You can view it in the Quizzes section.')
        navigate({ to: '/dashboard/quizzes' })
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || 'Failed to generate quiz')
      }
    } catch (error: any) {
      console.error('Failed to generate quiz:', error)
      message.error(error.message || 'Failed to generate quiz. Please check your connection.')
    } finally {
      setGenerating(false)
    }
  }

  const showOnboarding = !!(auth?.user && auth.user.projects?.length === 0);

  const materialsThisWeek = materials.filter(m => {
    const createdAt = new Date(m.created_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return createdAt >= sevenDaysAgo;
  }).length;

  const stats = [
    { label: 'Materials', value: (materials?.length || 0).toString(), sub: 'Total items', icon: FileText, color: 'bg-indigo-50 text-indigo-600', trend: `+${materialsThisWeek} this week` },
    { label: 'Slots Left', value: Math.max(0, setting_material.maximal - (materials?.length || 0)).toString(), sub: 'Remaining quota', icon: Sparkles, color: 'bg-amber-50 text-amber-600', trend: `${setting_material.maximal} limit` },
    { label: 'Quizzes', value: '24', sub: 'Completed', icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600', trend: '92% avg score' },
  ]

  return (
    <>
      <OnboardingModal isVisible={showOnboarding} />
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8 sm:space-y-12 pb-10 sm:pb-20"
      >
        {/* Hero & Quick Actions */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <motion.div variants={item} className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Intelligence Synchronized
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] sm:leading-[0.9] mb-4 sm:mb-6">
              Elevate your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600">
                Lumina Experience.
              </span>
            </h1>
            <p className="text-slate-500 text-sm sm:text-lg font-medium leading-relaxed max-w-lg">
              Welcome back, {auth?.user?.full_name?.split(' ')[0] || 'Explorer'}. Your personal knowledge vault is ready for new insights.
            </p>
          </motion.div>

          <motion.div variants={item} className="flex flex-wrap gap-4 lg:justify-end">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white/50 backdrop-blur-md p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-200/60 shadow-sm min-w-[200px] sm:min-w-[240px] flex-1 lg:flex-none">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`w-10 h-10 sm:w-14 sm:h-14 ${stat.color} rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm shrink-0`}>
                    <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">{stat.label}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl sm:text-3xl font-black text-slate-800">{stat.value}</span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md">{stat.trend}</span>
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
            <KnowledgeVault
              materials={materials}
              loading={loading}
              onAddMaterial={() => setIsUploadModalVisible(true)}
              onRemoveMaterial={handleRemoveMaterial}
              variants={item}
            />
          </div>

          <motion.div variants={item} className="lg:col-span-5 bg-slate-900 rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-12 shadow-2xl shadow-indigo-900/40 flex flex-col relative overflow-hidden group border border-white/10 noise-bg">
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/40 rotate-3 group-hover:rotate-6 transition-transform">
                  <Zap className="w-8 h-8 text-white fill-current" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white leading-none mb-2">Quiz Architect</h3>
                  <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.3em]">AI Engine v{setting_quiz.ai_version}</p>
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
                      options={materials.filter(m => m.status === 'completed').map(m => ({ value: m.id, label: m.file_name }))}
                      onChange={(val) => setSelectedMaterial(val)}
                      suffixIcon={<BookOpen className="w-4 h-4 opacity-40" />}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-indigo-300/60 uppercase tracking-[0.25em] block px-1">Count</label>
                      <Segmented
                        block
                        options={setting_quiz.count}
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
                        options={setting_quiz.level}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-indigo-300/60 uppercase tracking-[0.25em] block px-1">Topic Focus <span className="normal-case tracking-normal font-medium opacity-50">(optional)</span></label>
                    <input
                      type="text"
                      placeholder='e.g. "pecahan", "fotosintesis"'
                      value={quizTopic}
                      onChange={(e) => setQuizTopic(e.target.value)}
                      maxLength={255}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-2xl text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 transition-colors"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-indigo-300/60 uppercase tracking-[0.25em] block px-1">Custom Instructions <span className="normal-case tracking-normal font-medium opacity-50">(optional)</span></label>
                    <textarea
                      placeholder='e.g. "use English for grade 5 SD"'
                      value={quizCustomRequest}
                      onChange={(e) => setQuizCustomRequest(e.target.value)}
                      maxLength={500}
                      rows={2}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-2xl text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 transition-colors resize-none"
                    />
                  </div>
                </div>
              </ConfigProvider>

              <button
                onClick={handleGenerateQuiz}
                disabled={!selectedMaterial || generating}
                className="w-full mt-12 py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-600/30 active:scale-[0.97] group/gen disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                )}
                {generating ? 'Processing Neural Patterns...' : 'Initialize Generation'}
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
              currentCount={materials.length}
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
