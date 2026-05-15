import React from 'react'
import { BookOpen, BrainCircuit, Sparkles, Globe, Search } from 'lucide-react'

interface ToolBadgeProps {
  tool: string
}

export function ToolBadge({ tool }: ToolBadgeProps) {
  const map: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    search_material: { 
      icon: <BookOpen className="w-3 h-3" />, 
      label: 'Searched materials', 
      color: 'bg-violet-100 text-violet-700' 
    },
    get_context: { 
      icon: <BrainCircuit className="w-3 h-3" />, 
      label: 'Fetched your data', 
      color: 'bg-indigo-100 text-indigo-700' 
    },
    get_quiz_questions: { 
      icon: <BrainCircuit className="w-3 h-3" />, 
      label: 'Loaded quiz questions', 
      color: 'bg-amber-100 text-amber-700' 
    },
    get_quiz_results: { 
      icon: <Sparkles className="w-3 h-3" />, 
      label: 'Checked quiz results', 
      color: 'bg-emerald-100 text-emerald-700' 
    },
    web_search: { 
      icon: <Globe className="w-3 h-3" />, 
      label: 'Searched the web', 
      color: 'bg-sky-100 text-sky-700' 
    },
    update_quiz: { 
      icon: <BrainCircuit className="w-3 h-3" />, 
      label: 'Updated quiz', 
      color: 'bg-rose-100 text-rose-700' 
    },
  }
  
  const info = map[tool] ?? { 
    icon: <Search className="w-3 h-3" />, 
    label: tool, 
    color: 'bg-slate-100 text-slate-600' 
  }
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${info.color}`}>
      {info.icon}{info.label}
    </span>
  )
}
