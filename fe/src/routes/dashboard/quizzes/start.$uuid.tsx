import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  ChevronRight, Clock, Info, CheckCircle2, ChevronLeft,
  Sparkles, Loader2, AlertCircle, Bot, X,
} from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { message } from 'antd'
import { authFetch } from '../../../lib/api'
import { useStreamFeedback } from '../../../hooks/useStreamFeedback'
import { AIFeedbackPanel } from '../../../components/dashboard/AIFeedbackPanel'

export const Route = createFileRoute('/dashboard/quizzes/start/$uuid')({
  component: StartQuizPage,
})

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const item: Variants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

interface Question {
  id: string
  question_text: string
  options: Record<string, string>
  question_metadata?: Record<string, unknown>
}

interface SessionData {
  session_id: string
  quiz_id: string
  total_questions: number
  questions: Question[]
}


// ── Component ─────────────────────────────────────────────────────────────────
function StartQuizPage() {
  const { uuid } = Route.useParams()
  const navigate = useNavigate()

  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [showFeedback, setShowFeedback] = useState(false)

  const { feedback, progressMsg, suggestions, score, streaming, isCorrect, startStream, clearFeedback } = useStreamFeedback()

  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  const initSession = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const sessionRes = await authFetch(`/api/v1/quizzes/${uuid}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!sessionRes.ok) {
        const err = await sessionRes.json().catch(() => ({}))
        throw new Error(err.detail || 'Failed to start session')
      }
      const session = await sessionRes.json()

      const qRes = await authFetch(`/api/v1/quiz_sessions/${session.id}/questions`)
      if (!qRes.ok) throw new Error('Failed to load questions')
      const qData = await qRes.json()

      setSessionData({
        session_id: session.id,
        quiz_id: uuid,
        total_questions: qData.total_questions,
        questions: qData.questions,
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start quiz')
    } finally {
      setLoading(false)
    }
  }, [uuid])

  useEffect(() => { initSession() }, [initSession])

  const currentQuestion = sessionData?.questions[currentIdx]

  const handleSelectAnswer = (key: string) => {
    if (!currentQuestion || showFeedback) return
    setSelectedAnswer(key)
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: key }))
  }

  const handleSubmitForFeedback = async () => {
    if (!sessionData || !currentQuestion || !selectedAnswer) return
    setSubmitting(true)
    try {
      await authFetch(`/api/v1/quiz_sessions/${sessionData.session_id}/submit_answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          user_answer: currentQuestion.options[selectedAnswer],
        }),
      })
      // Start streaming feedback
      setShowFeedback(true)
      startStream(sessionData.session_id, currentQuestion.id)
    } catch {
      // Non-blocking
    } finally {
      setSubmitting(false)
    }
  }

  const handleNext = async () => {
    if (!sessionData) return
    clearFeedback()
    setShowFeedback(false)

    if (currentIdx < sessionData.total_questions - 1) {
      setCurrentIdx((i) => i + 1)
      setSelectedAnswer(answers[sessionData.questions[currentIdx + 1]?.id] ?? null)
    } else {
      try {
        await authFetch(`/api/v1/quiz_sessions/${sessionData.session_id}/complete`, {
          method: 'POST',
        })
      } catch { /* ignore */ }
      message.success('Quiz completed!')
      navigate({ to: '/dashboard/quizzes/result/$sessionId', params: { sessionId: sessionData.session_id } })
    }
  }

  const handlePrev = () => {
    if (currentIdx > 0 && !showFeedback) {
      setCurrentIdx((i) => i - 1)
      setSelectedAnswer(answers[sessionData?.questions[currentIdx - 1]?.id ?? ''] ?? null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto" />
          <p className="text-slate-500 font-medium">Preparing your quiz...</p>
        </div>
      </div>
    )
  }

  if (error || !sessionData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-sm">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <p className="text-slate-800 font-black text-lg">{error || 'Failed to load quiz'}</p>
          <button
            onClick={() => navigate({ to: '/dashboard/quizzes' })}
            className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    )
  }

  const total = sessionData.total_questions
  const progress = ((currentIdx + 1) / total) * 100

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-4xl mx-auto space-y-8 pt-4 pb-20">
      {/* Header */}
      <motion.div variants={item} className="bg-white/50 backdrop-blur-md border border-slate-200/60 rounded-[2rem] p-6 shadow-sm flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 leading-none mb-1">Quiz Session</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Question {currentIdx + 1} of {total}
            </p>
          </div>
        </div>
        <div className="flex-1 max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{currentIdx + 1}/{total}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div animate={{ width: `${progress}%` }} className="h-full bg-emerald-500 rounded-full transition-all duration-500" />
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-black tracking-widest">{formatTime(elapsed)}</span>
        </div>
      </motion.div>

      {/* Question Card */}
      {currentQuestion && (
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200/60 rounded-[2.5rem] p-10 shadow-xl shadow-emerald-500/5"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-6">
            <Info className="w-3 h-3" />
            {(currentQuestion.question_metadata?.difficulty as string) || 'Multiple Choice'}
          </div>
          <h3 className="text-xl font-black text-slate-800 leading-snug mb-8 max-w-2xl">
            {currentQuestion.question_text}
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {Object.entries(currentQuestion.options).map(([key, value]) => {
              const isSelected = selectedAnswer === key
              return (
                <button
                  key={key}
                  onClick={() => handleSelectAnswer(key)}
                  disabled={showFeedback}
                  className={`flex items-center justify-between p-5 rounded-2xl border transition-all text-left disabled:cursor-default ${isSelected
                    ? 'border-emerald-500 bg-emerald-50 shadow-md'
                    : 'border-slate-100 bg-slate-50/50 hover:border-emerald-300 hover:bg-emerald-50/30 disabled:hover:border-slate-100 disabled:hover:bg-slate-50/50'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-colors border ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-400'
                      }`}>
                      {key}
                    </div>
                    <span className="text-sm font-semibold text-slate-600">{value}</span>
                  </div>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                </button>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* AI Feedback Panel */}
      <AIFeedbackPanel
        showFeedback={showFeedback}
        isCorrect={isCorrect}
        streaming={streaming}
        progressMsg={progressMsg}
        feedback={feedback}
        suggestions={suggestions}
        score={score}
        neutralTheme="indigo"
      />

      {/* Navigation */}
      <motion.div variants={item} className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={currentIdx === 0 || showFeedback}
          className="flex items-center gap-2 px-6 py-4 text-slate-400 disabled:opacity-30 hover:text-slate-800 transition-all font-black uppercase tracking-widest text-xs"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <div className="flex gap-4">
          <button
            onClick={() => navigate({ to: '/dashboard/quizzes' })}
            className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all"
          >
            Quit
          </button>

          {!showFeedback ? (
            <button
              onClick={handleSubmitForFeedback}
              disabled={!selectedAnswer || submitting}
              className="flex items-center gap-3 px-10 py-4 bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-500 transition-all shadow-xl shadow-slate-900/10 active:scale-95 group"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Submit Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={streaming}
              className="flex items-center gap-3 px-10 py-4 bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-600 transition-all shadow-xl active:scale-95 group"
            >
              {currentIdx === total - 1 ? 'Finish Quiz' : 'Next Question'}
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
