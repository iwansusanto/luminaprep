import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { motion, type Variants } from 'framer-motion'
import {
  ChevronRight, Info, CheckCircle2, ChevronLeft,
  BrainCircuit, Loader2, AlertCircle, Clock, Sparkles,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { message } from 'antd'
import { authFetch } from '../../../lib/api'
import { useStreamFeedback } from '../../../hooks/useStreamFeedback'
import { AIFeedbackPanel } from '../../../components/dashboard/AIFeedbackPanel'

export const Route = createFileRoute('/dashboard/quizzes/continue/$uuid')({
  component: ContinueQuizPage,
})

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

interface Question {
  id: string
  question_text: string
  options: Record<string, string>
  question_metadata?: Record<string, unknown>
}


function ContinueQuizPage() {
  const { uuid } = Route.useParams()
  const navigate = useNavigate()

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
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
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const initSession = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qRes = await authFetch(`/api/v1/quiz_sessions/${uuid}/questions`)
      if (!qRes.ok) throw new Error('Failed to load questions')
      const qData = await qRes.json()
      setSessionId(uuid)
      setQuestions(qData.questions || [])
      setCurrentIdx(qData.latest_question || 0)
      setElapsed(qData.latest_time || 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start quiz')
    } finally {
      setLoading(false)
    }
  }, [uuid])

  useEffect(() => { initSession() }, [initSession])

  const currentQuestion = questions[currentIdx]
  const total = questions.length

  const handleSelect = (key: string) => {
    if (!currentQuestion || showFeedback) return
    setSelectedAnswer(key)
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: key }))
  }

  const handleSubmitForFeedback = async () => {
    if (!sessionId || !currentQuestion || !selectedAnswer) return
    setSubmitting(true)
    try {
      await authFetch(`/api/v1/quiz_sessions/${sessionId}/submit_answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          user_answer: currentQuestion.options[selectedAnswer],
        }),
      })
      setShowFeedback(true)
      startStream(sessionId, currentQuestion.id)
    } catch { /* non-blocking */ }
    setSubmitting(false)
  }

  const handleNext = async () => {
    clearFeedback()
    setShowFeedback(false)
    if (currentIdx < total - 1) {
      setCurrentIdx((i) => i + 1)
      setSelectedAnswer(answers[questions[currentIdx + 1]?.id] ?? null)
    } else {
      try {
        await authFetch(`/api/v1/quiz_sessions/${sessionId}/complete`, { method: 'POST' })
      } catch { /* ignore */ }
      message.success('Quiz completed!')
      navigate({ to: '/dashboard/quizzes/result/$sessionId', params: { sessionId: sessionId! } })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
      </div>
    )
  }

  if (error || !questions.length) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <p className="text-slate-800 font-black">{error || 'No questions found'}</p>
          <button onClick={() => navigate({ to: '/dashboard/quizzes' })} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider">
            Back to Quizzes
          </button>
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-4xl mx-auto space-y-8 pt-4 pb-20">
      {/* Header */}
      <motion.div variants={item} className="bg-white/50 backdrop-blur-md border border-slate-200/60 rounded-[2rem] p-6 shadow-sm flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 leading-none mb-1">Resume Session</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Question {currentIdx + 1} of {total}</p>
          </div>
        </div>
        <div className="flex-1 max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Questions Remaining</span>
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{total - currentIdx} Left</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div animate={{ width: `${((currentIdx + 1) / total) * 100}%` }} className="h-full bg-amber-500 rounded-full transition-all duration-500" />
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl shadow-md">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-black tracking-widest">{formatTime(elapsed)}</span>
        </div>
      </motion.div>

      {/* Question */}
      {currentQuestion && (
        <motion.div key={currentQuestion.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200/60 rounded-[2.5rem] p-10 shadow-xl shadow-amber-500/5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest mb-6">
            <Info className="w-3 h-3" />
            {(currentQuestion.question_metadata?.difficulty as string) || 'Multiple Choice'}
          </div>
          <h3 className="text-xl font-black text-slate-800 leading-snug mb-8 max-w-2xl">{currentQuestion.question_text}</h3>
          <div className="grid grid-cols-1 gap-3">
            {Object.entries(currentQuestion.options).map(([key, value]) => {
              const isSelected = selectedAnswer === key
              return (
                <button key={key} onClick={() => handleSelect(key)} disabled={showFeedback}
                  className={`flex items-center justify-between p-5 rounded-2xl border transition-all text-left disabled:cursor-default ${isSelected ? 'border-amber-500 bg-amber-50 shadow-md' : 'border-slate-100 bg-slate-50/50 hover:border-amber-300 disabled:hover:border-slate-100'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black border transition-colors ${isSelected ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>{key}</div>
                    <span className="text-sm font-semibold text-slate-600">{value}</span>
                  </div>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" />}
                </button>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Feedback */}
      <AIFeedbackPanel
        showFeedback={showFeedback}
        isCorrect={isCorrect}
        streaming={streaming}
        progressMsg={progressMsg}
        feedback={feedback}
        suggestions={suggestions}
        score={score}
        neutralTheme="amber"
      />

      {/* Navigation */}
      <motion.div variants={item} className="flex items-center justify-between">
        <button onClick={() => { setCurrentIdx((i) => i - 1); setSelectedAnswer(answers[questions[currentIdx - 1]?.id] ?? null) }}
          disabled={currentIdx === 0 || showFeedback}
          className="flex items-center gap-2 px-6 py-4 text-slate-400 disabled:opacity-30 hover:text-slate-800 transition-all font-black uppercase tracking-widest text-xs">
          <ChevronLeft className="w-4 h-4" /> Back to Previous
        </button>
        <div className="flex gap-4">
          <button onClick={() => navigate({ to: '/dashboard/quizzes' })} className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all">
            Save & Exit
          </button>
          {!showFeedback ? (
            <button onClick={handleSubmitForFeedback} disabled={!selectedAnswer || submitting}
              className="flex items-center gap-3 px-10 py-4 bg-slate-900 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-amber-500 transition-all shadow-xl active:scale-95 group">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Submit Answer
            </button>
          ) : (
            <button onClick={handleNext} disabled={streaming}
              className="flex items-center gap-3 px-10 py-4 bg-amber-500 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-amber-600 transition-all shadow-xl active:scale-95 group">
              {currentIdx === total - 1 ? 'Complete Quiz' : 'Next Question'}
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
