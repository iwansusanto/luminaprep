import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useAuth } from '../../../context/AuthContext'
import { api } from '../../../lib/api'
import { Skeleton, message, Modal, Dropdown } from 'antd'
import {
  Search,
  Filter,
  Plus,
  BrainCircuit,
  MoreVertical,
  History,
  BarChart3,
  Sparkles,
  Loader2,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from '@tanstack/react-table'
import { DataTable } from '../../../components/dashboard/DataTable'
import { QuizGenerationDrawer } from '../../../components/dashboard/QuizGenerationDrawer'

interface Material {
  id: string
  file_name: string
  storage_path: string
  file_type: string
  file_size: number | null
  citations: string | null
  status: string
  summary: string | null
  project_id: string
  user_id: string
  created_at: string
  updated_at: string
}

export const Route = createFileRoute('/dashboard/quizzes/')({
  component: QuizzesPage,
})

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

type Quiz = {
  id: string
  difficulty_level: string
  question_count: number
  status: string
  created_at: string
  updated_at: string
  project_id: string
}

const statusMap: Record<string, 'Ready' | 'Draft' | 'Generated' | 'Failed' | 'Processing' | 'Completed'> = {
  draft: 'Draft',
  generated: 'Generated',
  completed: 'Ready',
  finish: 'Completed',
  failed: 'Failed',
  processing: 'Processing',
}

const complexityMap: Record<string, 'Beginner' | 'Intermediate' | 'Mastery'> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  expert: 'Mastery',
}

const columnHelper = createColumnHelper<Quiz>()

function QuizzesPage() {
  const auth = useAuth()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [quizDrawerVisible, setQuizDrawerVisible] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const prevQuizzesRef = useRef<Quiz[]>([])

  const projectId = auth?.user?.projects?.[0]?.id

  const fetchData = useCallback(
    async (silent = false) => {
      if (!projectId) return
      if (!silent) setLoading(true)
      try {
        const [quizzesData, materialsData] = await Promise.all([
          api.get<Quiz[]>(`/quizzes/projects/${projectId}/quizzes`),
          api.get<{ materials: Material[] }>(`/materials/project/${projectId}`),
        ])
        const newQuizzes = Array.isArray(quizzesData) ? quizzesData : []

        // Notify when a processing quiz becomes completed
        newQuizzes.forEach((q) => {
          const prev = prevQuizzesRef.current.find((p) => p.id === q.id)
          if (prev?.status === 'processing' && q.status === 'completed') {
            message.success(`Quiz #${newQuizzes.indexOf(q) + 1} is ready! ${q.question_count} questions generated.`)
          }
        })
        prevQuizzesRef.current = newQuizzes

        setQuizzes(newQuizzes)
        setMaterials(Array.isArray(materialsData.materials) ? materialsData.materials : [])
      } catch (error) {
        console.error('Failed to fetch data:', error)
        if (!silent) message.error('Failed to load dashboard data')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [projectId],
  )

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Poll every 5s while any quiz is processing
  useEffect(() => {
    const hasProcessing = quizzes.some((q) => q.status === 'processing')
    if (!hasProcessing) return
    const interval = setInterval(() => fetchData(true), 5000)
    return () => clearInterval(interval)
  }, [fetchData, quizzes])

  const handleDeleteQuiz = (quiz: Quiz, index: number) => {
    Modal.confirm({
      title: 'Delete Quiz',
      content: `Are you sure you want to delete Quiz #${index + 1}? This cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      centered: true,
      onOk: async () => {
        try {
          await api.delete(`/quizzes/${quiz.id}`)
          setQuizzes((prev) => prev.filter((q) => q.id !== quiz.id))
          message.success('Quiz deleted successfully')
        } catch (err: any) {
          message.error(err.message || 'Failed to delete quiz')
        }
      },
    })
  }

  const handleGenerateQuiz = () => {
    fetchData()
    setQuizDrawerVisible(false)
  }

  const handleOpenDrawer = () => {
    const completedMaterials = materials.filter((m) => m.status === 'completed')
    if (completedMaterials.length === 0) {
      message.info('Please upload and process some materials first.')
      return
    }
    setSelectedMaterial(completedMaterials[0])
    setQuizDrawerVisible(true)
  }

  const filteredQuizzes = useMemo(() => {
    if (!searchQuery.trim()) return quizzes
    const q = searchQuery.toLowerCase()
    return quizzes.filter(
      (quiz) =>
        quiz.difficulty_level.toLowerCase().includes(q) ||
        quiz.status.toLowerCase().includes(q),
    )
  }, [quizzes, searchQuery])

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'name',
        header: 'Quiz Name',
        cell: (info) => (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800 leading-none mb-1.5">
                Quiz #{info.row.index + 1}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {info.row.original.question_count} Questions
              </p>
            </div>
          </div>
        ),
      }),
      columnHelper.accessor('difficulty_level', {
        header: 'Complexity',
        cell: (info) => {
          const val = complexityMap[info.getValue() as keyof typeof complexityMap] || 'Intermediate'
          const colors = {
            Beginner: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            Intermediate: 'bg-amber-50 text-amber-600 border-amber-100',
            Mastery: 'bg-rose-50 text-rose-600 border-rose-100',
          }
          return (
            <span
              className={`inline-flex items-center px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${colors[val]}`}
            >
              {val}
            </span>
          )
        },
      }),
      columnHelper.display({
        id: 'score',
        header: 'Best Score',
        cell: () => <span className="text-sm font-medium text-slate-300">—</span>,
      }),
      columnHelper.accessor('created_at', {
        header: 'Created At',
        cell: (info) => {
          const date = new Date(info.getValue())
          return (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-700">{date.toLocaleDateString()}</span>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )
        },
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => {
          const val = statusMap[info.getValue() as keyof typeof statusMap] || 'Generated'
          const colors = {
            Ready: 'text-indigo-600 bg-indigo-50 border-indigo-100',
            Completed: 'text-purple-600 bg-purple-50 border-purple-100',
            Generated: 'text-emerald-600 bg-emerald-50 border-emerald-100',
            Draft: 'text-slate-400 bg-slate-50 border-slate-100',
            Failed: 'text-rose-600 bg-rose-50 border-rose-100',
            Processing: 'text-amber-600 bg-amber-50 border-amber-100',
          }
          return (
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${val === 'Ready'
                  ? 'bg-indigo-500'
                  : val === 'Completed'
                    ? 'bg-purple-500'
                    : val === 'Generated'
                      ? 'bg-emerald-500'
                      : val === 'Failed'
                        ? 'bg-rose-500'
                        : val === 'Processing'
                          ? 'bg-amber-500 animate-pulse'
                          : 'bg-slate-300'
                  }`}
              />
              <span className={`text-[10px] font-black uppercase tracking-widest ${colors[val]}`}>
                {val}
              </span>
              {val === 'Processing' && <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />}
            </div>
          )
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: () => <span className="text-right block">Actions</span>,
        cell: (info) => {
          const quiz = info.row.original
          const idx = info.row.index
          const isDisabled = quiz.status === 'failed' || quiz.status === 'processing'
          const startPath =
            quiz.status === 'completed'
              ? '/dashboard/quizzes/start/$uuid'
              : quiz.status === 'draft'
                ? '/dashboard/quizzes/continue/$uuid'
                : '/dashboard/quizzes/retake/$uuid'
          const startLabel =
            quiz.status === 'completed'
              ? 'Start'
              : quiz.status === 'finish'
                ? 'Retake'
                : quiz.status === 'draft'
                  ? 'Continue'
                  : quiz.status === 'failed'
                    ? 'Failed'
                    : quiz.status === 'processing'
                      ? 'Processing...'
                      : 'Not Ready'

          const buttonColors: Record<string, string> = {
            completed: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20',
            finish: 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-500/20',
            draft: 'bg-slate-800 text-white hover:bg-slate-900 shadow-slate-800/20',
            failed: 'bg-rose-100 text-rose-400 cursor-not-allowed shadow-none pointer-events-none',
            processing: 'bg-amber-100 text-amber-500 cursor-not-allowed shadow-none pointer-events-none',
          }

          const buttonColorClass = buttonColors[quiz.status] || 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none pointer-events-none'

          return (
            <div className="flex items-center justify-end gap-3 pr-4">
              <Link
                to={startPath}
                params={{ uuid: quiz.id }}
                disabled={isDisabled}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 ${buttonColorClass}`}
              >
                {startLabel}
              </Link>

              <Dropdown
                trigger={['click']}
                menu={{
                  items: [
                    {
                      key: 'refresh',
                      icon: <RefreshCw className="w-3.5 h-3.5" />,
                      label: 'Refresh Status',
                      onClick: () => fetchData(true),
                    },
                    {
                      key: 'delete',
                      icon: <Trash2 className="w-3.5 h-3.5" />,
                      label: 'Delete Quiz',
                      danger: true,
                      onClick: () => handleDeleteQuiz(quiz, idx),
                    },
                  ],
                }}
              >
                <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </Dropdown>
            </div>
          )
        },
      }),
    ],
    [fetchData],
  )

  const table = useReactTable({
    data: filteredQuizzes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  })

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-20">
      {/* Page Header */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[10px] font-black uppercase tracking-widest mb-4">
            Mastery Track
          </div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none">My Quizzes</h2>
          <p className="text-slate-500 text-sm font-medium mt-3">Track your progress and test your knowledge.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenDrawer}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-indigo-600 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Generate New
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Avg Score', value: 'N/A', icon: BarChart3, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          {
            label: 'Ready',
            value: quizzes.filter((q) => q.status === 'completed').length.toString(),
            icon: History,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50',
          },
          {
            label: 'Total Qns',
            value: quizzes.reduce((acc, q) => acc + q.question_count, 0).toLocaleString(),
            icon: BrainCircuit,
            color: 'text-amber-500',
            bg: 'bg-amber-50',
          },
          { label: 'Accuracy', value: 'N/A', icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-slate-200/60 rounded-3xl p-5 flex items-center gap-4 shadow-sm">
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl font-black text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Table */}
      <motion.div variants={item} className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="relative group flex-1 max-w-md">
            <Search
              strokeWidth={1.5}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
            />
            <input
              type="text"
              placeholder="Filter by difficulty or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-6 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-medium"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData(true)}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 transition-all shadow-sm"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 transition-all shadow-sm">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 space-y-4">
            <Skeleton active />
            <Skeleton active />
            <Skeleton active />
          </div>
        ) : filteredQuizzes.length > 0 ? (
          <DataTable table={table} totalItems={filteredQuizzes.length} />
        ) : (
          <div className="py-24 px-8 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 border border-slate-100">
              <BrainCircuit className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">
              {searchQuery ? 'No quizzes match your search' : 'No quizzes found'}
            </h3>
            <p className="text-slate-500 font-medium max-w-xs mx-auto mb-8">
              {searchQuery
                ? 'Try a different search term.'
                : 'Generate your first quiz from a study material to start tracking your mastery.'}
            </p>
            {!searchQuery && (
              <Link
                to="/dashboard/materials"
                className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-100 active:scale-95"
              >
                Go to Materials
              </Link>
            )}
          </div>
        )}
      </motion.div>

      <QuizGenerationDrawer
        isVisible={quizDrawerVisible}
        onClose={() => setQuizDrawerVisible(false)}
        material={selectedMaterial}
        onGenerate={handleGenerateQuiz}
      />
    </motion.div>
  )
}
