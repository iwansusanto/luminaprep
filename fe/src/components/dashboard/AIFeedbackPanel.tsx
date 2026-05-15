import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, X, Bot, Sparkles, Loader2 } from 'lucide-react'

interface AIFeedbackPanelProps {
  showFeedback: boolean
  isCorrect: boolean | null
  streaming: boolean
  progressMsg?: string | null
  feedback: string
  suggestions?: string[]
  score?: number | null
  neutralTheme?: 'indigo' | 'amber'
}

export function AIFeedbackPanel({
  showFeedback,
  isCorrect,
  streaming,
  progressMsg,
  feedback,
  suggestions,
  score,
  neutralTheme = 'indigo'
}: AIFeedbackPanelProps) {
  
  // Theme mappings to ensure Tailwind doesn't purge classes
  const themeClasses = {
    indigo: {
      wrapper: 'bg-indigo-50/50 border-indigo-100 shadow-indigo-500/5',
      iconBg: 'bg-indigo-500 text-white shadow-indigo-600',
      headerText: 'text-indigo-700',
      sparkles: 'text-indigo-500',
      cursor: 'bg-indigo-400',
      bullet: 'bg-indigo-400'
    },
    amber: {
      wrapper: 'bg-amber-50/50 border-amber-100 shadow-amber-500/5',
      iconBg: 'bg-amber-500 text-white shadow-amber-600',
      headerText: 'text-amber-700',
      sparkles: 'text-amber-500',
      cursor: 'bg-amber-400',
      bullet: 'bg-amber-400'
    }
  }

  const neutral = themeClasses[neutralTheme]

  return (
    <AnimatePresence>
      {showFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className={`relative overflow-hidden rounded-[2rem] border p-8 shadow-2xl transition-all ${
            isCorrect === true
              ? 'bg-emerald-50/50 border-emerald-100 shadow-emerald-500/5'
              : isCorrect === false
                ? 'bg-rose-50/50 border-rose-100 shadow-rose-500/5'
                : neutral.wrapper
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-start gap-5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                isCorrect === true
                  ? 'bg-emerald-500 text-white shadow-emerald-600'
                  : isCorrect === false
                    ? 'bg-rose-500 text-white shadow-rose-600'
                    : neutral.iconBg
              }`}
            >
              {isCorrect === true ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : isCorrect === false ? (
                <X className="w-6 h-6" />
              ) : (
                <Bot className="w-6 h-6" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <h4
                  className={`text-sm font-bold tracking-wide ${
                    isCorrect === true
                      ? 'text-emerald-700'
                      : isCorrect === false
                        ? 'text-rose-700'
                        : neutral.headerText
                  }`}
                >
                  {isCorrect === true ? 'Correct!' : isCorrect === false ? 'Incorrect' : 'AI Feedback'}
                </h4>
                {streaming && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
              </div>
              {progressMsg && (
                <p className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
                  <Sparkles className={`w-4 h-4 animate-pulse ${
                    isCorrect === true ? 'text-emerald-500' : isCorrect === false ? 'text-rose-500' : neutral.sparkles
                  }`} />
                  {progressMsg}
                </p>
              )}
              {feedback && (
                <p className="text-[15px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {feedback}
                  {streaming && (
                    <motion.span
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      className={`inline-block w-1.5 h-4 ml-1 rounded-sm align-middle ${
                        isCorrect === true ? 'bg-emerald-400' : isCorrect === false ? 'bg-rose-400' : neutral.cursor
                      }`}
                    />
                  )}
                </p>
              )}
              {streaming && !feedback && !progressMsg && (
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className={`inline-block w-1.5 h-4 rounded-sm align-middle ${
                    isCorrect === true ? 'bg-emerald-400' : isCorrect === false ? 'bg-rose-400' : neutral.cursor
                  }`}
                />
              )}

              {suggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-6 p-5 rounded-2xl bg-white/60 border border-white shadow-sm"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Suggestions for Improvement</p>
                  <ul className="space-y-2">
                    {suggestions.map((s, i) => (
                      <li key={i} className="text-sm text-slate-700 flex items-start gap-3">
                        <span className={`flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full ${
                          isCorrect === true ? 'bg-emerald-400' : isCorrect === false ? 'bg-rose-400' : neutral.bullet
                        }`} />
                        <span className="leading-snug">{s}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {score !== null && score !== undefined && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="mt-6 inline-flex items-center gap-3 px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Score</span>
                  <span className={`text-lg font-black ${
                    score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-500' : 'text-rose-600'
                  }`}>{score}%</span>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
