import React, { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { motion, type Variants } from 'framer-motion'
import {
  FileText,
  Clock,
  MoreVertical,
  Sparkles,
  ChevronRight,
  BookOpen,
  Trash2,
  PlusCircle
} from 'lucide-react'
import { Skeleton, Dropdown, type MenuProps, Drawer, Segmented, Select, ConfigProvider } from 'antd'
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

interface KnowledgeVaultProps {
  materials: Material[];
  loading: boolean;
  onAddMaterial: () => void;
  onRemoveMaterial?: (id: string) => void;
  onAddQuiz?: (id: string) => void;
  variants?: Variants;
}

export const KnowledgeVault: React.FC<KnowledgeVaultProps> = ({ 
  materials, 
  loading, 
  onAddMaterial, 
  onRemoveMaterial,
  onAddQuiz,
  variants 
}) => {
  const [quizDrawerVisible, setQuizDrawerVisible] = useState(false)
  const [selectedMaterialForQuiz, setSelectedMaterialForQuiz] = useState<Material | null>(null)
  const [quizSettings, setQuizSettings] = useState({
    questions: 20,
    complexity: 'intermediate'
  })

  const handleOpenQuizDrawer = (material: Material) => {
    setSelectedMaterialForQuiz(material)
    setQuizDrawerVisible(true)
  }

  const handleGenerateQuiz = () => {
    if (selectedMaterialForQuiz) {
      onAddQuiz?.(selectedMaterialForQuiz.id)
      setQuizDrawerVisible(false)
    }
  }

  return (
    <>
      <motion.div variants={variants} className="bg-white rounded-[2.5rem] border border-slate-200/60 p-10 shadow-sm spotlight-card">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">Knowledge Vault</h3>
          <p className="text-sm text-slate-500 font-medium">Your curated study collection.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onAddMaterial}
            className="px-5 py-2.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 group"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Add Material
          </button>
          <Link to="/dashboard/materials" className="px-5 py-2.5 bg-slate-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-50 transition-all border border-slate-200/50 flex items-center gap-2 group">
            Full Library
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border border-slate-100 rounded-[1.5rem]">
              <Skeleton.Avatar active size={56} shape="square" className="rounded-2xl" />
              <div className="flex-1">
                <Skeleton active paragraph={{ rows: 1 }} />
              </div>
            </div>
          ))
        ) : materials.length > 0 ? (
          materials.slice(0, 3).map((material) => {
            const items: MenuProps['items'] = [
              {
                key: 'quiz',
                label: (
                  <div className="flex items-center gap-2 py-1 px-1">
                    <PlusCircle className="w-4 h-4 text-indigo-500" />
                    <span className="font-bold text-[11px] uppercase tracking-wider text-slate-700">Generate Quiz</span>
                  </div>
                ),
                onClick: () => handleOpenQuizDrawer(material)
              },
              {
                type: 'divider',
              },
              {
                key: 'remove',
                label: (
                  <div className="flex items-center gap-2 py-1 px-1 text-rose-500">
                    <Trash2 className="w-4 h-4" />
                    <span className="font-bold text-[11px] uppercase tracking-wider">Remove Material</span>
                  </div>
                ),
                onClick: () => onRemoveMaterial?.(material.id)
              },
            ];

            return (
              <div key={material.id} className="flex items-center justify-between p-4 hover:bg-slate-50/80 border border-transparent hover:border-slate-200/50 rounded-[1.5rem] transition-all group cursor-pointer">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 leading-none mb-2">{material.file_name}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(material.created_at).toLocaleDateString()}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span>PDF Document</span>
                    </div>
                  </div>
                </div>
                <Dropdown
                  menu={{ items }}
                  trigger={['click']}
                  placement="bottomRight"
                  overlayClassName="premium-dropdown"
                >
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </Dropdown>
              </div>
            );
          })
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
              <BookOpen className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px] mb-6">Your vault is currently empty</p>
            <button
              onClick={onAddMaterial}
              className="px-8 py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-100 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Add Your First Material
            </button>
          </div>
        )}
      </div>
      </motion.div>

      <Drawer
        title={null}
        placement="right"
        onClose={() => setQuizDrawerVisible(false)}
        open={quizDrawerVisible}
        width={480}
        closeIcon={null}
        styles={{
          body: { padding: 0, overflow: 'hidden' },
          mask: { backdropFilter: 'blur(4px)', background: 'rgba(15, 23, 42, 0.2)' }
        }}
      >
        <div className="h-full flex flex-col bg-slate-50">
          <div className="p-10 bg-white border-b border-slate-100 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6 rotate-3">
                <Zap className="w-7 h-7 text-white fill-current" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Quiz Architect</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                Generating for: <span className="text-indigo-600">{selectedMaterialForQuiz?.file_name}</span>
              </p>
            </div>
          </div>

          <div className="flex-1 p-10 space-y-10 overflow-y-auto">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block px-1">Questions Count</label>
              <Segmented
                block
                size="large"
                options={[10, 20, 50]}
                value={quizSettings.questions}
                onChange={(val) => setQuizSettings(prev => ({ ...prev, questions: val as number }))}
                className="premium-segmented p-1.5 rounded-2xl bg-white border border-slate-200/60"
              />
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

          <div className="p-10 bg-white border-t border-slate-100">
            <button 
              onClick={handleGenerateQuiz}
              className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] group"
            >
              <Zap className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              Initialize Generation
            </button>
            <button 
              onClick={() => setQuizDrawerVisible(false)}
              className="w-full mt-4 py-3 text-slate-400 font-black uppercase tracking-widest text-[9px] hover:text-slate-600 transition-colors"
            >
              Cancel Process
            </button>
          </div>
        </div>
      </Drawer>
    </>
  )
}
