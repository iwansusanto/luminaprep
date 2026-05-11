import React, { useState } from 'react'
import { Drawer, Segmented, Select, ConfigProvider } from 'antd'
import { Sparkles as SparklesIcon, Zap } from 'lucide-react'

interface Material {
  id: string;
  file_name: string;
  storage_path: string;
  file_type: string;
  file_size: number | null;
  citations: string | null;
  project_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface QuizGenerationDrawerProps {
  isVisible: boolean;
  onClose: () => void;
  material: Material | null;
  onGenerate: (materialId: string, settings: { questions: number; complexity: string }) => void;
}

export const QuizGenerationDrawer: React.FC<QuizGenerationDrawerProps> = ({
  isVisible,
  onClose,
  material,
  onGenerate
}) => {
  const [quizSettings, setQuizSettings] = useState({
    questions: 20,
    complexity: 'intermediate'
  })

  const handleGenerate = () => {
    if (material) {
      onGenerate(material.id, quizSettings)
    }
  }

  return (
    <Drawer
      title={null}
      placement="right"
      onClose={onClose}
      open={isVisible}
      width={typeof window !== 'undefined' && window.innerWidth < 640 ? '100%' : 480}
      closeIcon={null}
      styles={{
        body: { padding: 0, overflow: 'hidden' },
        mask: { backdropFilter: 'blur(4px)', background: 'rgba(15, 23, 42, 0.2)' }
      }}
    >
      <div className="h-full flex flex-col bg-slate-50">
        <div className="p-6 sm:p-10 bg-white border-b border-slate-100 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6 rotate-3">
              <Zap className="w-7 h-7 text-white fill-current" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Quiz Architect</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
              Generating for: <span className="text-indigo-600 truncate max-w-[200px]">{material?.file_name}</span>
            </p>
          </div>
        </div>

        <div className="flex-1 p-6 sm:p-10 space-y-8 sm:space-y-10 overflow-y-auto">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block px-1">Questions Count</label>
            <ConfigProvider
              theme={{
                components: {
                  Segmented: {
                    itemSelectedBg: '#4f46e5',
                    itemSelectedColor: '#ffffff',
                    controlHeight: 48,
                  }
                }
              }}
            >
              <Segmented
                block
                size="large"
                options={[10, 20, 50]}
                value={quizSettings.questions}
                onChange={(val) => setQuizSettings(prev => ({ ...prev, questions: val as number }))}
                className="premium-segmented p-1.5 rounded-2xl bg-white border border-slate-200/60 font-black"
              />
            </ConfigProvider>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block px-1">Target Complexity</label>
            <Select
              className="w-full h-16 premium-select"
              value={quizSettings.complexity}
              onChange={(val) => setQuizSettings(prev => ({ ...prev, complexity: val }))}
              options={[
                { value: 'foundational', label: 'Foundational' },
                { value: 'intermediate', label: 'Intermediate' },
                { value: 'mastery', label: 'Mastery' },
              ]}
            />
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-200/60 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                <SparklesIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 uppercase tracking-tight mb-1">AI Recommendation</p>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Based on this document's density, we recommend 20 questions at Intermediate level for optimal retention.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10 bg-white border-t border-slate-100">
          <button
            onClick={handleGenerate}
            className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] group"
          >
            <Zap className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            Initialize Generation
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
