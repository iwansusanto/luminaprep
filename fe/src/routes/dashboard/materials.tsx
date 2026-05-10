import { useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Search,
  Filter,
  Plus,
  FileText,
  MoreVertical,
  Download,
  Trash2,
  ExternalLink,
  Clock,
  Tag
} from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from '@tanstack/react-table'
import { DataTable } from '../../components/dashboard/DataTable'

export const Route = createFileRoute('/dashboard/materials')({
  component: MaterialsPage,
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

type Material = {
  id: number
  name: string
  type: string
  size: string
  date: string
  category: string
  color: string
  bgColor: string
}

const columnHelper = createColumnHelper<Material>()

function MaterialsPage() {
  const data = useMemo<Material[]>(() => [
    { id: 1, name: 'Advanced Organic Chemistry.pdf', type: 'PDF', size: '4.2 MB', date: '2h ago', category: 'Chemistry', color: 'text-indigo-500', bgColor: 'bg-indigo-50' },
    { id: 2, name: 'Linear Algebra Concepts.docx', type: 'DOCX', size: '1.8 MB', date: 'Yesterday', category: 'Math', color: 'text-blue-500', bgColor: 'bg-blue-50' },
    { id: 3, name: 'World History: Part II.pptx', type: 'PPTX', size: '12.4 MB', date: '2 days ago', category: 'History', color: 'text-orange-500', bgColor: 'bg-orange-50' },
    { id: 4, name: 'Quantum Mechanics Intro.pdf', type: 'PDF', size: '8.1 MB', date: '3 days ago', category: 'Physics', color: 'text-purple-500', bgColor: 'bg-purple-50' },
    { id: 5, name: 'Macroeconomics 101.pdf', type: 'PDF', size: '2.5 MB', date: '1 week ago', category: 'Economics', color: 'text-emerald-500', bgColor: 'bg-emerald-50' },
    { id: 6, name: 'Neuroscience Basics.pdf', type: 'PDF', size: '5.2 MB', date: '1 week ago', category: 'Biology', color: 'text-rose-500', bgColor: 'bg-rose-50' },
  ], [])

  const columns = useMemo(() => [
    columnHelper.accessor('name', {
      header: 'File Name',
      cell: info => (
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 ${info.row.original.bgColor} ${info.row.original.color} rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500`}>
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-800 leading-none mb-1.5">{info.getValue()}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{info.row.original.type}</p>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('category', {
      header: 'Category',
      cell: info => (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200/50">
          <Tag className="w-3 h-3" />
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('date', {
      header: 'Added',
      cell: info => <span className="text-sm font-medium text-slate-500">{info.getValue()}</span>,
    }),
    columnHelper.accessor('size', {
      header: 'Size',
      cell: info => <span className="text-sm font-medium text-slate-500">{info.getValue()}</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: () => <span className="text-right block">Actions</span>,
      cell: () => (
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Download">
            <Download className="w-4 h-4" />
          </button>
          <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Open">
            <ExternalLink className="w-4 h-4" />
          </button>
          <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-slate-200 mx-1" />
          <button className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      ),
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[10px] font-black uppercase tracking-widest mb-4">
            Repository
          </div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none">
            Study Materials
          </h2>
          <p className="text-slate-500 text-sm font-medium mt-3">Manage and organize your learning resources.</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
            <Plus className="w-4 h-4" />
            Add New
          </button>
        </div>
      </motion.div>

      {/* Search & Stats Bar */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 relative group">
          <Search
            strokeWidth={1.5}
            className="absolute left-7 top-[1.8rem] -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
          />
          <input
            type="text"
            placeholder="Search by file name, category, or content..."
            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200/60 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 rounded-3xl outline-none transition-all font-medium text-slate-700 shadow-sm"
          />
        </div>
        <div className="lg:col-span-4 flex gap-4">
          <div className="flex-1 bg-white border border-slate-200/60 rounded-3xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Files</p>
              <p className="text-lg font-black text-slate-800">128</p>
            </div>
          </div>
          <div className="flex-1 bg-white border border-slate-200/60 rounded-3xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Storage</p>
              <p className="text-lg font-black text-slate-800">1.2 GB</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Materials Table/List */}
      <motion.div variants={item} className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
        <DataTable table={table} totalItems={data.length} />
      </motion.div>


    </motion.div>
  )
}
