import React, { useState } from 'react'
import { setting_material } from '../../lib/utils'
import { Link, useNavigate } from '@tanstack/react-router'
import { motion, type Variants } from 'framer-motion'
import {
  FileText,
  Clock,
  MoreVertical,
  Sparkles,
  ChevronRight,
  BookOpen,
  Trash2,
  PlusCircle,
  Trophy,
  ArrowUpRight,
  AlertCircle
} from 'lucide-react'
import { Skeleton, Dropdown, type MenuProps } from 'antd'
import { QuizGenerationDrawer } from './QuizGenerationDrawer'

interface Material {
  id: string;
  file_name: string;
  storage_path: string;
  file_type: string;
  file_size: number | null;
  citations: string | null;
  status: string;
  summary: string | null;
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
  const navigate = useNavigate()
  const [quizDrawerVisible, setQuizDrawerVisible] = useState(false)
  const [selectedMaterialForQuiz, setSelectedMaterialForQuiz] = useState<Material | null>(null)

  const handleOpenQuizDrawer = (material: Material) => {
    setSelectedMaterialForQuiz(material)
    setQuizDrawerVisible(true)
  }

  const handleGenerateQuiz = (materialId: string) => {
    onAddQuiz?.(materialId)
    setQuizDrawerVisible(false)
  }

  return (
    <>
      <motion.div variants={variants} className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200/60 p-6 sm:p-10 shadow-sm spotlight-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 sm:gap-0 mb-8">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Knowledge Vault</h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Your curated study collection.</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onAddMaterial}
              disabled={materials.length >= setting_material.maximal}
              className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 group whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {materials.length >= setting_material.maximal ? 'Limit reached' : 'Add Material'}
            </button>
            <Link to="/dashboard/materials" className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 bg-slate-50 text-indigo-600 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-50 transition-all border border-slate-200/50 flex items-center justify-center gap-2 group whitespace-nowrap">
              Library
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
                <div key={material.id} className="flex items-center justify-between p-3 sm:p-4 hover:bg-slate-50/80 border border-transparent hover:border-slate-200/50 rounded-2xl sm:rounded-[1.5rem] transition-all group cursor-pointer">
                  <div className="flex items-center gap-3 sm:gap-5">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-50 text-indigo-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500 shrink-0">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-black text-slate-800 leading-none mb-1.5 truncate pr-2">{material.file_name}</p>
                      <div className="flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1 whitespace-nowrap"><Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {new Date(material.created_at).toLocaleDateString()}</span>
                        <span className="w-0.5 h-0.5 bg-slate-300 rounded-full" />
                        <span className="truncate">{material.file_type.toUpperCase()}</span>
                        <span className="w-0.5 h-0.5 bg-slate-300 rounded-full" />
                        <span className={`flex items-center gap-1 ${material.status === 'completed' ? 'text-emerald-500' :
                            material.status === 'failed' ? 'text-rose-500' :
                              'text-amber-500'
                          }`}>
                          {material.status === 'processing' && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Clock className="w-2.5 h-2.5" /></motion.div>}
                          {material.status === 'completed' && <Sparkles className="w-2.5 h-2.5" />}
                          {material.status === 'failed' && <AlertCircle className="w-2.5 h-2.5" />}
                          {material.status}
                        </span>
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
                disabled={materials.length >= setting_material.maximal}
                className="px-8 py-4 bg-indigo-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-indigo-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-100 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {materials.length >= setting_material.maximal ? 'Maximum limit reached' : 'Add Your First Material'}
              </button>
            </div>
          )}

          {/* Fill space if few records */}
          {!loading && materials.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-6 sm:mt-8 p-6 sm:p-8 border border-dashed rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-between group transition-all ${materials.length >= setting_material.maximal
                ? 'bg-rose-50/30 border-rose-200 cursor-not-allowed opacity-80'
                : 'bg-slate-50/50 border-slate-200 cursor-pointer hover:bg-indigo-50/30 hover:border-indigo-200'
                }`}
              onClick={() => materials.length < setting_material.maximal && onAddMaterial()}
            >
              <div className="flex items-center gap-4 sm:gap-6">
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm transition-transform duration-500 shrink-0 ${materials.length >= setting_material.maximal ? 'bg-rose-50 text-rose-500' : 'bg-white text-indigo-500 group-hover:scale-110'
                  }`}>
                  {materials.length >= setting_material.maximal ? <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" /> : <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />}
                </div>
                <div>
                  <p className={`text-sm sm:text-base font-black mb-0.5 ${materials.length >= setting_material.maximal ? 'text-rose-600' : 'text-slate-800'}`}>
                    {materials.length >= setting_material.maximal ? 'Vault Capacity Full' : 'Expand your Vault'}
                  </p>
                  <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-[0.15em] leading-relaxed ${materials.length >= setting_material.maximal ? 'text-rose-400' : 'text-slate-400'}`}>
                    {materials.length >= setting_material.maximal
                      ? 'You have reached the maximum study material limit.'
                      : <>Upload more to unlock neural <br className="hidden sm:block" /> insights & mastery challenges.</>}
                  </p>
                </div>
              </div>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl shadow-sm border flex items-center justify-center transition-transform shrink-0 ${materials.length >= setting_material.maximal
                ? 'bg-rose-50 text-rose-300 border-rose-100'
                : 'bg-white text-indigo-600 border-slate-100 group-hover:translate-x-1'
                }`}>
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </motion.div>
          )}

          {/* Mastery Challenge placeholder if few records */}
          {!loading && materials.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4 sm:mt-6 p-6 sm:p-8 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[1.5rem] sm:rounded-[2.5rem] text-white relative overflow-hidden group cursor-pointer border border-white/5"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 group-hover:scale-110 transition-transform">
                <Trophy className="w-32 sm:w-40 h-32 sm:h-40" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-lg sm:rounded-xl flex items-center justify-center backdrop-blur-md">
                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
                  </div>
                  <h4 className="text-lg sm:text-xl font-black tracking-tight">Mastery Challenge</h4>
                </div>
                <p className="text-indigo-200/60 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-[0.2em] mb-6 sm:mb-8 leading-relaxed">
                  Synthesize knowledge from your <br className="hidden sm:block" /> entire vault into a final assessment.
                </p>
                <button
                  onClick={() => navigate({ to: '/dashboard/quizzes' })}
                  className="px-5 py-2.5 sm:px-6 sm:py-3 bg-white text-indigo-600 rounded-lg sm:rounded-xl font-black uppercase tracking-widest text-[9px] sm:text-[10px] flex items-center gap-2 hover:bg-indigo-50 transition-all active:scale-95"
                >
                  Start Mastery <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      <QuizGenerationDrawer
        isVisible={quizDrawerVisible}
        onClose={() => setQuizDrawerVisible(false)}
        material={selectedMaterialForQuiz}
        onGenerate={handleGenerateQuiz}
      />
    </>
  )
}
