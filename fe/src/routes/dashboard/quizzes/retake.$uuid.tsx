import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  ChevronRight, Clock, Info, CheckCircle2, ChevronLeft,
  BrainCircuit, Loader2, AlertCircle, XCircle, Bot, Sparkles,
} from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { message } from 'antd'
import { authFetch } from '../../../lib/api'

export const Route = createFileRoute('/dashboard/quizzes/retake/$uuid')({
  component: RetakeQuizPage,
})

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const item: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
}

interface Question {
  id: string
  question_text: string
  options: Record<string, string>
  question_metadata?: Record<string, unknown>
}

function useStreamFeedback() {
  const [feedback, setFeedback] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const esRef = useRef<EventSource | null>(null)

  const startStream = useCallback((sessionId: string, questionId: string) => {
    if (esRef.current) esRef.current.close()
    setFeedback('')
    setIsCorrect(null)
    setStreaming(true)
    const token = localStorage.getItem('lumina_token')
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : ''
    const es = new EventSource(`/api/v1/stream/feedback/${sessionId}/${questionId}${tokenParam}`)
    esRef.current = es
    es.onmessage = (e) => {
      if (e.data === '[DONE]') { setStreaming(false); es.close(); return }
      try {
        const p = JSON.parse(e.data)
        if (p.type === 'start') setIsCorrect(p.is_correct)
        else if (p.type === 'token') setFeedback((prev) => prev + p.content)
        else if (p.type === 'done' || p.type === 'error') { setStreaming(false); es.close() }
      } catch { /* ignore */ }
    }
    es.onerror = () => { setStreaming(false); es.close() }
  }, [])

  const clearFeedback = useCallback(() => {
    esRef.current?.close()
    setFeedback('')
    setIsCorrect(null)
    setStreaming(false)
  }, [])

  useEffect(() => () => esRef.current?.close(), [])
  return { feedback, streaming, isCorrect, startStream, clearFeedback }
}

function RetakeQuizPage() {
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

  const { feedback, streaming, isCorrect, startStream, clearFeedback } = useStreamFeedback()

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
        throw new Error((err as { detail?: string }).detail || 'Failed to start session')
      }
      const session = await sessionRes.json()
      setSessionId(session.id)
      const qRes = await authFetch(`/api/v1/quiz_sessions/${session.id}/questions`)
      if (!qRes.ok) throw new Error('Failed to load questions')
      const qData = await qRes.json()
      setQuestions(qData.questions || [])
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
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
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
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 leading-none mb-1">Retake Session</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Question {currentIdx + 1} of {total}</p>
          </div>
        </div>
        <div className="flex-1 max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{currentIdx + 1}/{total}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div animate={{ width: `${((currentIdx + 1) / total) * 100}%` }} className="h-full bg-indigo-600 rounded-full transition-all duration-500" />
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl">
          <Clock className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-black tracking-widest">{formatTime(elapsed)}</span>
        </div>
      </motion.div>

      {/* Question */}
      {currentQuestion && (
        <motion.div key={currentQuestion.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200/60 rounded-[2.5rem] p-10 shadow-xl shadow-indigo-500/5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-6">
            <Info className="w-3 h-3" /> Multiple Choice
          </div>
          <h3 className="text-xl font-black text-slate-800 leading-snug mb-8 max-w-2xl">{currentQuestion.question_text}</h3>
          <div className="grid grid-cols-1 gap-3">
            {Object.entries(currentQuestion.options).map(([key, value]) => {
              const isSelected = selectedAnswer === key
              return (
                <button key={key} onClick={() => handleSelect(key)} disabled={showFeedback}
                  className={`flex items-center justify-between p-5 rounded-2xl border transition-all text-left disabled:cursor-default ${isSelected ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-slate-100 bg-slate-50/50 hover:border-indigo-300 disabled:hover:border-slate-100'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black border transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>{key}</div>
                    <span className="text-sm font-semibold text-slate-600">{value}</span>
                  </div>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />}
                </button>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Feedback */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            className={`rounded-[2rem] border p-8 shadow-lg ${isCorrect === true ? 'bg-emerald-50 border-emerald-200' : isCorrect === false ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${isCorrect === true ? 'bg-emerald-500' : isCorrect === false ? 'bg-rose-500' : 'bg-indigo-500'}`}>
                {isCorrect === true ? <CheckCircle2 className="w-5 h-5 text-white" /> : isCorrect === false ? <XCircle className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <p className={`text-xs font-black uppercase tracking-widest ${isCorrect === true ? 'text-emerald-700' : isCorrect === false ? 'text-rose-700' : 'text-indigo-700'}`}>
                    {isCorrect === true ? 'Correct!' : isCorrect === false ? 'Incorrect' : 'AI Feedback'}
                  </p>
                  {streaming && <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {feedback}
                  {streaming && <span className="inline-block w-1 h-4 bg-slate-400 animate-pulse ml-0.5 align-middle" />}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <motion.div variants={item} className="flex items-center justify-between">
        <button onClick={() => { setCurrentIdx((i) => i - 1); setSelectedAnswer(answers[questions[currentIdx - 1]?.id] ?? null) }}
          disabled={currentIdx === 0 || showFeedback}
          className="flex items-center gap-2 px-6 py-4 text-slate-400 disabled:opacity-30 hover:text-slate-800 transition-all font-black uppercase tracking-widest text-xs">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex gap-4">
          <button onClick={() => navigate({ to: '/dashboard/quizzes' })} className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all">
            Quit
          </button>
          {!showFeedback ? (
            <button onClick={handleSubmitForFeedback} disabled={!selectedAnswer || submitting}
              className="flex items-center gap-3 px-10 py-4 bg-slate-900 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-600 transition-all shadow-xl active:scale-95 group">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Submit Answer
            </button>
          ) : (
            <button onClick={handleNext} disabled={streaming}
              className="flex items-center gap-3 px-10 py-4 bg-indigo-600 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-xl active:scale-95 group">
              {currentIdx === total - 1 ? 'Submit Quiz' : 'Next Question'}
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
