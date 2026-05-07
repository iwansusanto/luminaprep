import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '../../context/AuthContext'
import {
  FileText,
  CheckCircle2,
  Trophy,
  UploadCloud,
  Link as LinkIcon,
  Type,
  MoreVertical,
  ChevronRight,
  Sparkles
} from 'lucide-react'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardIndexPage,
})

function DashboardIndexPage() {
  const auth = useAuth()

  const stats = [
    { label: 'Materials', value: '8', sub: 'Total uploaded', icon: FileText, color: 'bg-indigo-100 text-indigo-600' },
    { label: 'Quizzes Created', value: '15', sub: 'Total quizzes', icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-600' },
    { label: 'Average Score', value: '78%', sub: 'Across all quizzes', icon: Trophy, color: 'bg-amber-100 text-amber-600' },
  ]

  const recentMaterials = [
    { name: 'Molecular Biology Notes.pdf', date: 'Uploaded 2 days ago', pages: '24 pages', category: 'Biology', iconColor: 'text-rose-500', bgColor: 'bg-rose-50' },
    { name: 'Cell Structure.docx', date: 'Uploaded 3 days ago', pages: '18 pages', category: 'Biology', iconColor: 'text-blue-500', bgColor: 'bg-blue-50' },
    { name: 'Photosynthesis.pptx', date: 'Uploaded 5 days ago', pages: '32 slides', category: 'Biology', iconColor: 'text-orange-500', bgColor: 'bg-orange-50' },
  ]

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-800">{stat.value}</span>
                  <span className="text-xs text-slate-400">{stat.sub}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Area */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-6">1. Upload or Add Material</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-700">Drag & drop your file here</p>
                <p className="text-sm text-slate-500">or click to browse</p>
              </div>
              <p className="text-xs text-slate-400 mt-2">Supports PDF, DOCX, PPTX, TXT, MD, URL</p>
            </div>

            <div className="flex flex-col gap-4">
              <p className="text-sm font-semibold text-slate-600">Or add by link or text</p>
              <button className="flex items-center justify-center gap-3 w-full py-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-700 font-medium">
                <LinkIcon className="w-5 h-5 text-slate-400" />
                Add from Link
              </button>
              <button className="flex items-center justify-center gap-3 w-full py-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-700 font-medium">
                <Type className="w-5 h-5 text-slate-400" />
                Paste Text
              </button>
            </div>
          </div>
        </div>

        {/* Generate Quiz Card */}
        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 mb-6">2. Generate Quiz</h2>
          <p className="text-sm text-slate-500 mb-8">Choose your quiz preferences and let AI do the magic!</p>

          <div className="space-y-6 flex-1">
            <div>
              <label className="text-sm font-semibold text-slate-600 block mb-2">Number of Questions</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none focus:border-indigo-500 transition-all">
                <option>10 Questions</option>
                <option>20 Questions</option>
                <option>30 Questions</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-600 block mb-2">Difficulty Level</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none focus:border-indigo-500 transition-all">
                <option>Intermediate</option>
                <option>Beginner</option>
                <option>Advanced</option>
              </select>
            </div>
          </div>

          <button className="w-full mt-8 py-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95">
            <Sparkles className="w-5 h-5" />
            Generate Quiz
          </button>
        </div>
      </div>

      {/* Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Materials */}
        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-slate-800">4. Recent Materials</h2>
            <button className="text-indigo-600 text-sm font-semibold hover:underline">View all</button>
          </div>
          <div className="space-y-4">
            {recentMaterials.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${item.bgColor} ${item.iconColor} rounded-xl flex items-center justify-center`}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.date} • {item.pages}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-semibold rounded-full">{item.category}</span>
                  <button className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Start Quiz */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 shadow-xl text-white flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6">
            <Trophy className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Ready for a challenge?</h2>
          <p className="text-indigo-100 mb-8 max-w-xs">Take a quick quiz based on your recent materials and test your knowledge!</p>
          <button className="bg-white text-indigo-600 px-8 py-4 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-50 transition-all group">
            Start Quiz Now
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  )
}
