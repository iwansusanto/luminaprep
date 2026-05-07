import { useMemo } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { 
  Search, 
  Filter, 
  Plus, 
  BrainCircuit, 
  MoreVertical, 
  Play, 
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
  id: number
  uuid: string
  name: string
  score: number | null
  date: string
  complexity: 'Beginner' | 'Intermediate' | 'Mastery'
  questions: number
  status: 'Completed' | 'Draft' | 'Ready'
}

const columnHelper = createColumnHelper<Quiz>()

function QuizzesPage() {
  const data = useMemo<Quiz[]>(() => [
    { id: 1, uuid: 'a1b2c3d4-e5f6-4a5b-b6c7-d8e9f0a1b2c3', name: 'Organic Chemistry Basics', score: 85, date: '2h ago', complexity: 'Intermediate', questions: 20, status: 'Completed' },
    { id: 2, uuid: 'b2c3d4e5-f6a7-4b6c-c7d8-e9f0a1b2c3d4', name: 'Linear Algebra: Matrices', score: 92, date: 'Yesterday', complexity: 'Mastery', questions: 15, status: 'Completed' },
    { id: 3, uuid: 'c3d4e5f6-a7b8-4c7d-d8e9-f0a1b2c3d4e5', name: 'European History 1800s', score: null, date: 'Ready to start', complexity: 'Beginner', questions: 30, status: 'Ready' },
    { id: 4, uuid: 'd4e5f6a7-b8c9-4d8e-e9f0-a1b2c3d4e5f6', name: 'Quantum Physics Intro', score: 78, date: '3 days ago', complexity: 'Mastery', questions: 10, status: 'Completed' },
    { id: 5, uuid: 'e5f6a7b8-c9d0-4e9f-f0a1-b2c3d4e5f6a7', name: 'Microeconomics Principles', score: null, date: 'Draft', complexity: 'Intermediate', questions: 25, status: 'Draft' },
  ], [])

  const columns = useMemo(() => [
    columnHelper.accessor('name', {
      header: 'Quiz Name',
      cell: info => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-800 leading-none mb-1.5">{info.getValue()}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{info.row.original.questions} Questions</p>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('complexity', {
      header: 'Complexity',
      cell: info => {
        const val = info.getValue()
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
    columnHelper.accessor('score', {
      header: 'Best Score',
      cell: info => {
        const val = info.getValue()
        if (val === null) return <span className="text-sm font-medium text-slate-300">—</span>
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500" style={{ width: `${val}%` }} />
            </div>
            <span className="text-sm font-black text-slate-700">{val}%</span>
          </div>
        )
      },
    }),
    columnHelper.accessor('date', {
      header: 'Status / Date',
      cell: info => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-500">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <span className="text-right block">Actions</span>,
      cell: info => {
        const quiz = info.row.original
        if (quiz.status === 'Completed' || quiz.status === 'Ready') {
          return (
            <div className="flex items-center justify-end gap-2">
              <Link
                to={quiz.status === 'Completed' ? "/dashboard/quizzes/retake/$uuid" : "/dashboard/quizzes/continue/$uuid"}
                params={{ uuid: quiz.uuid }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-100 active:scale-95"
              >
                <Play className="w-3 h-3 fill-current" />
                {quiz.status === 'Completed' ? 'Retake' : 'Start'}
              </Link>
              <button className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          )
        }

        return (
          <div className="flex items-center justify-end gap-2">
            <Link
              to="/dashboard/quizzes/continue/$uuid"
              params={{ uuid: quiz.uuid }}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Continue
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
              placeholder="Filter by quiz name..."
              className="w-full pl-11 pr-6 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-medium"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 transition-all shadow-sm">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
        <DataTable table={table} totalItems={data.length} />
      </motion.div>
    </motion.div>
  )
}
