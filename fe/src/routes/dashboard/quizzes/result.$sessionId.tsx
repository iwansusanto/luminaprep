import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { motion, type Variants } from 'framer-motion'
import {
  Trophy, CheckCircle2, XCircle, RotateCcw,
  ArrowLeft, BrainCircuit, Sparkles, Loader2, AlertCircle,
  Target, Clock, Zap, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '../../../lib/api'

export const Route = createFileRoute('/dashboard/quizzes/result/$sessionId')({
  component: QuizResultPage,
})

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
}

interface BreakdownItem {
  question_id: string
  question_text: string
  options: Record<string, string>
  correct_answer: string
  explanation: string | null
  user_answer: string | null
  is_correct: boolean
  score_earned: number
  feedback_text: string | null
}

interface SessionResult {
  session_id: string
  quiz_id: string
  status: string
  total_questions: number
  correct_answers: number
  score: number
  started_at: string | null
  completed_at: string | null
  breakdown: BreakdownItem[]
}

// ── Score ring ────────────────────────────────────────────────────────────────
function ScoreRing({ pct, size = 180 }: { pct: number; size?: number }) {
  const r = (size - 20) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(100, Math.max(0, pct)) / 100) * circ
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'
  const label = pct >= 80 ? 'Excellent' : pct >= 60 ? 'Good' : pct >= 40 ? 'Fair' : 'Keep Practicing'

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={12} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={12} strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
            className="text-4xl font-black text-slate-800"
          >
            {Math.round(pct)}%
          </motion.span>
        </div>
      </div>
      <span className="text-xs font-black uppercase tracking-widest" style={{ color }}>{label}</span>
    </div>
  )
}

// ── Breakdown item ────────────────────────────────────────────────────────────
function BreakdownCard({ item: b, index }: { item: BreakdownItem; index: number }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`rounded-2xl border overflow-hidden ${b.is_correct ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/40'}`}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-4 p-5 text-left"
      >
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${b.is_correct ? 'bg-emerald-500' : 'bg-rose-500'}`}>
          {b.is_correct
            ? <CheckCircle2 className="w-4 h-4 text-white" />
            : <XCircle className="w-4 h-4 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 leading-snug line-clamp-2">{b.question_text}</p>
          <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${b.is_correct ? 'text-emerald-600' : 'text-rose-600'}`}>
            {b.is_correct ? 'Correct' : 'Incorrect'}
          </p>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
          : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-200/60 pt-4">
          {/* Options */}
          <div className="space-y-2">
            {Object.entries(b.options).map(([key, value]) => {
              const isCorrect = value === b.correct_answer
              const isUser = value === b.user_answer
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm ${
                    isCorrect
                      ? 'bg-emerald-100 border border-emerald-300 text-emerald-800'
                      : isUser && !isCorrect
                      ? 'bg-rose-100 border border-rose-300 text-rose-800'
                      : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                    isCorrect ? 'bg-emerald-500 text-white' : isUser && !isCorrect ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>{key}</span>
                  <span className="flex-1">{value}</span>
                  {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                  {isUser && !isCorrect && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                </div>
              )
            })}
          </div>

          {/* Explanation */}
          {b.explanation && (
            <div className="bg-white/70 rounded-xl p-4 border border-slate-200/60">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Explanation</p>
              <p className="text-sm text-slate-600 leading-relaxed">{b.explanation}</p>
            </div>
          )}

          {/* AI Feedback */}
          {b.feedback_text && (
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">AI Feedback</p>
              <p className="text-sm text-indigo-700 leading-relaxed">{b.feedback_text}</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
function QuizResultPage() {
  const { sessionId } = Route.useParams()
  const navigate = useNavigate()

  const [result, setResult] = useState<SessionResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadResult = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch(`/api/v1/quiz_sessions/sessions/${sessionId}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { detail?: string }).detail || 'Session not found')
      }
      const data: SessionResult = await res.json()
      setResult(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load results')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => { loadResult() }, [loadResult])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto" />
          <p className="text-slate-500 font-medium">Loading your results...</p>
        </div>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-sm">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <p className="text-slate-800 font-black text-lg">{error || 'Results not found'}</p>
          <button onClick={() => navigate({ to: '/dashboard/quizzes' })} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider">
            Back to Quizzes
          </button>
        </div>
      </div>
    )
  }

  const scorePct = result.total_questions > 0
    ? (result.correct_answers / result.total_questions) * 100
    : 0

  const duration = result.started_at && result.completed_at
    ? Math.round((new Date(result.completed_at).getTime() - new Date(result.started_at).getTime()) / 1000)
    : null

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-4xl mx-auto space-y-8 pt-4 pb-20">

      {/* Back */}
      <motion.div variants={item}>
        <Link to="/dashboard/quizzes" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-700 transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Quizzes
        </Link>
      </motion.div>

      {/* Hero card */}
      <motion.div variants={item} className="bg-white border border-slate-200/60 rounded-[2.5rem] p-10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="shrink-0"><ScoreRing pct={scorePct} size={180} /></div>
          <div className="flex-1 space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-3">
                <Trophy className="w-3 h-3" /> Quiz Complete
              </div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                {scorePct >= 80 ? 'Outstanding!' : scorePct >= 60 ? 'Well Done!' : scorePct >= 40 ? 'Keep Going!' : 'Keep Practicing!'}
              </h1>
              <p className="text-slate-500 text-sm font-medium mt-2">
                You answered <span className="font-black text-slate-700">{result.correct_answers}</span> out of <span className="font-black text-slate-700">{result.total_questions}</span> questions correctly.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: CheckCircle2, value: result.correct_answers, label: 'Correct', color: 'bg-emerald-100 text-emerald-600' },
                { icon: XCircle, value: result.total_questions - result.correct_answers, label: 'Incorrect', color: 'bg-rose-100 text-rose-600' },
                { icon: Clock, value: duration ? formatDuration(duration) : '—', label: 'Time', color: 'bg-indigo-100 text-indigo-600' },
              ].map((s) => (
                <div key={s.label} className="bg-slate-50 rounded-2xl p-4 text-center">
                  <div className={`w-8 h-8 ${s.color} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-black text-slate-800">{s.value}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats bar */}
      <motion.div variants={item} className="grid grid-cols-3 gap-4">
        {[
          { icon: Target, label: 'Accuracy', value: `${Math.round(scorePct)}%`, color: scorePct >= 80 ? 'text-emerald-600 bg-emerald-50' : scorePct >= 60 ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50' },
          { icon: BrainCircuit, label: 'Questions', value: result.total_questions.toString(), color: 'text-indigo-600 bg-indigo-50' },
          { icon: Zap, label: 'Score', value: result.score.toFixed(1), color: 'text-purple-600 bg-purple-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200/60 rounded-3xl p-5 flex items-center gap-4 shadow-sm">
            <div className={`w-11 h-11 ${s.color} rounded-2xl flex items-center justify-center shrink-0`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
              <p className="text-xl font-black text-slate-800">{s.value}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Question breakdown */}
      {result.breakdown.length > 0 && (
        <motion.div variants={item} className="space-y-4">
          <h2 className="text-lg font-black text-slate-800">Question Breakdown</h2>
          <div className="space-y-3">
            {result.breakdown.map((b, i) => (
              <BreakdownCard key={b.question_id} item={b} index={i} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div variants={item} className="flex flex-col sm:flex-row gap-4">
        <Link
          to="/dashboard/quizzes/retake/$uuid"
          params={{ uuid: result.quiz_id }}
          className="flex-1 flex items-center justify-center gap-3 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] hover:bg-indigo-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
        >
          <RotateCcw className="w-4 h-4" /> Retake Quiz
        </Link>
        <Link
          to="/dashboard/quizzes"
          className="flex-1 flex items-center justify-center gap-3 py-5 bg-white border border-slate-200 text-slate-700 rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] hover:bg-slate-50 transition-all active:scale-95"
        >
          <BrainCircuit className="w-4 h-4" /> All Quizzes
        </Link>
        <Link
          to="/dashboard"
          className="flex-1 flex items-center justify-center gap-3 py-5 bg-indigo-50 text-indigo-600 rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] hover:bg-indigo-100 transition-all active:scale-95"
        >
          <Sparkles className="w-4 h-4" /> Dashboard
        </Link>
      </motion.div>

    </motion.div>
  )
}
