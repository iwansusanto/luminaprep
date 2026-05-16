import React from 'react'
import { motion } from 'framer-motion'

interface ScoreQuizProps {
  scoreCorrect: number
  totalQuestions: number
  className?: string
}

export const ScoreQuiz: React.FC<ScoreQuizProps> = ({ scoreCorrect, totalQuestions, className }) => {
  const pct = totalQuestions > 0 ? Math.round((scoreCorrect / totalQuestions) * 100) : 0
  const isGood = pct >= 80
  const isAvg = pct >= 50 && pct < 80

  const theme = isGood
    ? { text: 'text-emerald-600', bar: 'bg-emerald-500', track: 'bg-emerald-50', border: 'border-emerald-100' }
    : isAvg
      ? { text: 'text-amber-600', bar: 'bg-amber-500', track: 'bg-amber-50', border: 'border-amber-100' }
      : { text: 'text-rose-600', bar: 'bg-rose-500', track: 'bg-rose-50', border: 'border-rose-100' }

  return (
    <div className={`flex flex-col gap-2 min-w-[130px] ${className || ''}`}>
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-baseline gap-1">
          <span className={`text-sm font-black tracking-tight tabular-nums ${theme.text}`}>
            {pct}
          </span>
          <span className={`text-[10px] font-bold uppercase ${theme.text} opacity-70`}>%</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 shadow-sm">
          <span className="text-[9px] font-black text-slate-700 tabular-nums">
            {scoreCorrect}
          </span>
          <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">of</span>
          <span className="text-[9px] font-black text-slate-400 tabular-nums">
            {totalQuestions}
          </span>
        </div>
      </div>

      <div className={`h-2 w-full ${theme.track} rounded-full p-[2px] border ${theme.border} shadow-inner relative overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }} // Springy feel
          className={`h-full rounded-full ${theme.bar} shadow-sm relative z-10`}
        >
          {/* Subtle shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-50" />
        </motion.div>
      </div>
    </div>
  )
}
