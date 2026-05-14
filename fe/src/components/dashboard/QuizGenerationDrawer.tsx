import React, { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Drawer, Segmented, Select, ConfigProvider, message, Input } from 'antd'
import { Sparkles as SparklesIcon, Zap, Loader2, Clock, AlertCircle } from 'lucide-react'
import { setting_quiz } from '../../lib/utils'

const { TextArea } = Input

interface Material {
  id: string
  file_name: string
  storage_path: string
  file_type: string
  file_size: number | null
  citations: string | null
  status: string
  summary: string | null
  project_id: string
  user_id: string
  created_at: string
  updated_at: string
}

interface QuizGenerationDrawerProps {
  isVisible: boolean
  onClose: () => void
  material: Material | null
  onGenerate: (materialId: string, settings: { questions: number; complexity: string }) => void
}

export const QuizGenerationDrawer: React.FC<QuizGenerationDrawerProps> = ({
  isVisible,
  onClose,
  material,
  onGenerate,
}) => {
  const navigate = useNavigate()
  const [quizSettings, setQuizSettings] = useState({
    questions: 20,
    complexity: 'intermediate',
  })
  const [topic, setTopic] = useState('')
  const [customRequest, setCustomRequest] = useState('')
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!material) return

    setGenerating(true)
    try {
      const body: Record<string, unknown> = {
        question_count: quizSettings.questions,
        difficulty_level: quizSettings.complexity,
      }
      if (topic.trim()) body.topic = topic.trim()
      if (customRequest.trim()) body.custom_request = customRequest.trim()

      const response = await fetch(`/api/v1/quizzes/materials/${material.id}/quizzes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        message.success('Quiz generation started!')
        onGenerate(material.id, quizSettings)
        navigate({ to: '/dashboard/quizzes' })
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.message || 'Failed to generate quiz')
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to generate quiz'
      message.error(msg)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Drawer
      title={null}
      placement="right"
      onClose={onClose}
      open={isVisible}
      width={typeof window !== 'undefined' && window.innerWidth < 640 ? '100%' : 520}
      closeIcon={null}
      styles={{
        body: { padding: 0, overflow: 'hidden' },
        mask: { backdropFilter: 'blur(4px)', background: 'rgba(15, 23, 42, 0.2)' },
      }}
    >
      <div className="h-full flex flex-col bg-slate-50">
        {/* Header */}
        <div className="p-6 sm:p-10 bg-white border-b border-slate-100 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6 rotate-3">
              <Zap className="w-7 h-7 text-white fill-current" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Quiz Architect</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
              Generating for:{' '}
              <span className="text-indigo-600 truncate max-w-[200px]">{material?.file_name}</span>
            </p>
            {material?.status !== 'completed' && (
              <div
                className={`mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  material?.status === 'failed'
                    ? 'bg-rose-50 text-rose-500'
                    : 'bg-amber-50 text-amber-500'
                }`}
              >
                {material?.status === 'processing' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <AlertCircle className="w-3 h-3" />
                )}
                {material?.status === 'failed' ? 'Analysis Failed' : 'Document Analysis in Progress'}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 sm:p-10 space-y-8 overflow-y-auto">
          {/* Questions count */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block px-1">
              Questions Count
            </label>
            <ConfigProvider
              theme={{
                components: {
                  Segmented: {
                    itemSelectedBg: '#4f46e5',
                    itemSelectedColor: '#ffffff',
                    controlHeight: 48,
                  },
                },
              }}
            >
              <Segmented
                block
                size="large"
                options={setting_quiz.count}
                value={quizSettings.questions}
                onChange={(val: number | string) => setQuizSettings((prev) => ({ ...prev, questions: val as number }))}
                className="premium-segmented p-1.5 rounded-2xl bg-white border border-slate-200/60 font-black"
              />
            </ConfigProvider>
          </div>

          {/* Complexity */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block px-1">
              Target Complexity
            </label>
            <Select
              className="w-full h-16 premium-select"
              value={quizSettings.complexity}
              onChange={(val: string) => setQuizSettings((prev) => ({ ...prev, complexity: val }))}
              options={setting_quiz.level}
            />
          </div>

          {/* Topic (optional) */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block px-1">
              Topic Focus{' '}
              <span className="text-slate-300 normal-case tracking-normal font-medium">(optional)</span>
            </label>
            <Input
              placeholder='e.g. "pecahan", "fotosintesis", "World War II"'
              value={topic}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTopic(e.target.value)}
              maxLength={255}
              className="rounded-2xl border-slate-200 h-12 text-sm"
            />
            <p className="text-[10px] text-slate-400 px-1">
              Narrows the quiz to a specific topic within the material.
            </p>
          </div>

          {/* Custom request (optional) */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block px-1">
              Custom Instructions{' '}
              <span className="text-slate-300 normal-case tracking-normal font-medium">(optional)</span>
            </label>
            <TextArea
              placeholder='e.g. "use English for grade 5", "focus on definitions", "include real-world examples"'
              value={customRequest}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomRequest(e.target.value)}
              maxLength={500}
              rows={3}
              className="rounded-2xl border-slate-200 text-sm resize-none"
            />
            <p className="text-[10px] text-slate-400 px-1">
              Tell the AI how to style or format the questions.
            </p>
          </div>

          {/* AI recommendation */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200/60 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                <SparklesIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 uppercase tracking-tight mb-1">
                  AI Recommendation
                </p>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Based on this document's density, we recommend 20 questions at Intermediate level for
                  optimal retention. Use the Topic and Custom Instructions fields to tailor the quiz to
                  your specific learning goals.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 sm:p-10 bg-white border-t border-slate-100">
          <button
            onClick={handleGenerate}
            disabled={generating || !material || material.status !== 'completed'}
            className="w-full py-5 bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] group"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : material?.status !== 'completed' ? (
              <Clock className="w-4 h-4" />
            ) : (
              <Zap className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            )}
            {generating
              ? 'Architecting Quiz...'
              : material?.status === 'failed'
              ? 'Analysis Failed'
              : material?.status !== 'completed'
              ? 'Processing Document...'
              : 'Initialize Generation'}
          </button>
          <button
            onClick={onClose}
            className="w-full mt-4 py-3 text-slate-400 font-black uppercase tracking-widest text-[9px] hover:text-slate-600 transition-colors"
          >
            Cancel Process
          </button>
        </div>
      </div>
    </Drawer>
  )
}
