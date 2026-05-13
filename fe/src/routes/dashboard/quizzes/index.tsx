import { useMemo, useState, useEffect, useCallback } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useAuth } from '../../../context/AuthContext'
import { api } from '../../../lib/api'
import { Skeleton, message } from 'antd'
import {
  Search,
  Filter,
  Plus,
  BrainCircuit,
  MoreVertical,
  History,
  BarChart3,
  Award,
  Sparkles
} from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from '@tanstack/react-table'
import { DataTable } from '../../../components/dashboard/DataTable'

export const Route = createFileRoute('/dashboard/quizzes/')({
  component: QuizzesPage,
})

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
}

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
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

const statusMap: Record<string, 'Ready' | 'Draft' | 'Generated' | 'Failed'> = {
  'draft': 'Draft',
  'generated': 'Generated',
  'completed': 'Ready',
  'failed': 'Failed'
}

const complexityMap: Record<string, 'Beginner' | 'Intermediate' | 'Mastery'> = {
  'beginner': 'Beginner',
  'intermediate': 'Intermediate',
  'expert': 'Mastery'
}

const columnHelper = createColumnHelper<Quiz>()

function QuizzesPage() {
  const auth = useAuth()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)

  const projectId = auth?.user?.projects?.[0]?.id

  const fetchQuizzes = useCallback(async () => {
    if (!projectId) return;
    setLoading(true)
    try {
      const data = await api.get<Quiz[]>(`/quizzes/projects/${projectId}/quizzes`)
      setQuizzes(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch quizzes:', error)
      message.error('Failed to load quizzes')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchQuizzes()
  }, [fetchQuizzes])

  const data = quizzes;

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'name',
      header: 'Quiz Name',
      cell: info => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-800 leading-none mb-1.5">Quiz #{info.row.index + 1}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{info.row.original.question_count} Questions</p>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('difficulty_level', {
      header: 'Complexity',
      cell: info => {
        const val = complexityMap[info.getValue() as keyof typeof complexityMap] || 'Intermediate'
        const colors = {
          Beginner: 'bg-emerald-50 text-emerald-600 border-emerald-100',
          Intermediate: 'bg-amber-50 text-amber-600 border-amber-100',
          Mastery: 'bg-rose-50 text-rose-600 border-rose-100',
        }
        return (
          <span className={`inline-flex items-center px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${colors[val]}`}>
            {val}
          </span>
        )
      },
    }),
    columnHelper.display({
      id: 'score',
      header: 'Best Score',
      cell: () => {
        return <span className="text-sm font-medium text-slate-300">—</span>
      },
    }),
    columnHelper.accessor('created_at', {
      header: 'Created At',
      cell: info => {
        const date = new Date(info.getValue())
        return (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-700">{date.toLocaleDateString()}</span>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )
      },
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => {
        const val = statusMap[info.getValue() as keyof typeof statusMap] || 'Generated'
        const colors = {
          Ready: 'text-indigo-600 bg-indigo-50 border-indigo-100',
          Generated: 'text-emerald-600 bg-emerald-50 border-emerald-100',
          Draft: 'text-slate-400 bg-slate-50 border-slate-100',
          Failed: 'text-rose-600 bg-rose-50 border-rose-100',
        }
        return (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${val === 'Ready' ? 'bg-indigo-500' :
              val === 'Generated' ? 'bg-emerald-500' :
                val === 'Failed' ? 'bg-rose-500' :
                  'bg-slate-300'
              }`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${colors[val]}`}>
              {val}
            </span>
          </div>
        )
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <span className="text-right block">Actions</span>,
      cell: info => {
        return (
          <div className="flex items-center justify-end gap-3 pr-4">
            <Link
              to={
                info.row.original.status === 'completed'
                  ? '/dashboard/quizzes/retake/$uuid'
                  : info.row.original.status === 'draft'
                    ? '/dashboard/quizzes/continue/$uuid'
                    : '/dashboard/quizzes/start/$uuid'
              }
              params={{ uuid: info.row.original.id }}
              disabled={info.row.original.status === 'failed'}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${info.row.original.status === 'failed'
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-slate-900/10'
                }`}
            >
              {info.row.original.status === 'completed' ? 'Review' : info.row.original.status === 'failed' ? 'Failed' : 'Start'}
            </Link>
            <button className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        )
      },
    }),
  ], [])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  })

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-20"
    >
      {/* Page Header */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[10px] font-black uppercase tracking-widest mb-4">
            Mastery Track
          </div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none">
            My Quizzes
          </h2>
          <p className="text-slate-500 text-sm font-medium mt-3">Track your progress and test your knowledge.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-2xl">
            <Award className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-black text-slate-700">Level 12</span>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-indigo-600 transition-all shadow-lg shadow-slate-900/10 active:scale-95">
            <Plus className="w-4 h-4" />
            Generate New
          </button>
        </div>
      </motion.div>

      {/* Stats Summary Bar */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Avg Score', value: '84%', icon: BarChart3, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: 'Completed', value: '18', icon: History, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Total Qns', value: '240', icon: BrainCircuit, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Accuracy', value: '76%', icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-50' },
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

      {/* Quizzes Table */}
      <motion.div variants={item} className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="relative group flex-1 max-w-md">
            <Search strokeWidth={1.5} className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Filter quizzes..."
              className="w-full pl-11 pr-6 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-medium"
            />
          </div>
          <div className="flex items-center gap-2">
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
        ) : quizzes.length > 0 ? (
          <DataTable table={table} totalItems={data.length} />
        ) : (
          <div className="py-24 px-8 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 border border-slate-100">
              <BrainCircuit className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">No quizzes found</h3>
            <p className="text-slate-500 font-medium max-w-xs mx-auto mb-8">
              Generate your first quiz from a study material to start tracking your mastery.
            </p>
            <Link
              to="/dashboard/materials"
              className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-100 active:scale-95"
            >
              Go to Materials
            </Link>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
