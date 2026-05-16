import { useMemo, useState, useEffect, useCallback } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { api } from '../../../lib/api'
import { Skeleton, message } from 'antd'
import {
  Search,
  Filter,
  Sparkles,
  Globe,
  Calendar,
} from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from '@tanstack/react-table'
import { DataTable } from '../../../components/dashboard/DataTable'

export const Route = createFileRoute('/dashboard/public-quizzes/')({
  component: PublicQuizzesPage,
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

type PublicQuiz = {
  quiz_id: string
  topic: string | null
  difficulty_level: string
  question_count: number
  created_at: string
}

const complexityMap: Record<string, 'Beginner' | 'Intermediate' | 'Mastery'> = {
  'beginner': 'Beginner',
  'intermediate': 'Intermediate',
  'expert': 'Mastery'
}

const columnHelper = createColumnHelper<PublicQuiz>()

function PublicQuizzesPage() {
  const [quizzes, setQuizzes] = useState<PublicQuiz[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPublicQuizzes = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<PublicQuiz[]>('/public_quizzes')
      setQuizzes(data)
    } catch (error) {
      message.error('Failed to load public quizzes')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPublicQuizzes()
  }, [fetchPublicQuizzes])

  const columns = useMemo(() => [
    columnHelper.accessor('topic', {
      header: 'Topic',
      cell: info => (
        <span className="font-semibold text-slate-700">
          {info.getValue() || 'Untitled'}
        </span>
      ),
    }),
    columnHelper.accessor('difficulty_level', {
      header: 'Difficulty',
      cell: info => {
        const level = info.getValue()
        const mapped = complexityMap[level] || level
        const colors: Record<string, string> = {
          'Beginner': 'bg-emerald-100 text-emerald-700',
          'Intermediate': 'bg-amber-100 text-amber-700',
          'Mastery': 'bg-rose-100 text-rose-700',
        }
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors[mapped] || 'bg-slate-100 text-slate-700'}`}>
            {mapped}
          </span>
        )
      },
    }),
    columnHelper.accessor('question_count', {
      header: 'Questions',
      cell: info => (
        <span className="text-slate-600 font-medium">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('created_at', {
      header: 'Published',
      cell: info => {
        const date = new Date(info.getValue())
        return (
          <span className="text-slate-500 text-sm">
            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <span className="text-right block">Actions</span>,
      cell: info => (
        <div className="flex items-center justify-end gap-3 pr-4">
          <Link
            to="/dashboard/public-quizzes/attempt/$uuid"
            params={{ uuid: info.row.original.quiz_id }}
            className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 bg-slate-900 text-white hover:bg-violet-600 shadow-slate-900/10"
          >
            Attempt
          </Link>
        </div>
      ),
    }),
  ], [])

  const table = useReactTable({
    data: quizzes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 text-[10px] font-black uppercase tracking-widest mb-4">
            <Globe className="w-3 h-3" />
            Community
          </div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none">
            Explore Quizzes
          </h2>
          <p className="text-slate-500 text-sm font-medium mt-3">Discover and attempt quizzes shared by the community.</p>
        </div>
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
          <DataTable table={table} totalItems={quizzes.length} />
        ) : (
          <div className="py-24 px-8 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 border border-slate-100">
              <Sparkles className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">No public quizzes yet</h3>
            <p className="text-slate-500 font-medium max-w-xs mx-auto">
              Check back soon! Community members will be sharing their quizzes here.
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
