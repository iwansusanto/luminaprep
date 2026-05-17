import { useMemo, useState, useEffect, useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { api } from '../../../lib/api'
import { Skeleton, message, Modal } from 'antd'
import {
  Sparkles,
  Globe,
  ArrowRight,
  BookOpen,
  User as UserIcon,
  Layers,
  CheckCircle2,
  Check,
  BadgeCheck,
} from 'lucide-react'
import { motion, type Variants } from 'framer-motion'
import { useAuth } from '../../../context/AuthContext'

export const Route = createFileRoute('/dashboard/public-quizzes/')({
  component: PublicQuizzesPage,
})

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
}

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
}

type PublicQuiz = {
  quiz_id: string
  topic: string | null
  material_file_name: string | null
  difficulty_level: string
  question_count: number
  created_at: string
  user_owner: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  } | null
  is_attempt?: boolean
}

const complexityMap: Record<string, { label: string; color: string }> = {
  'beginner': { label: 'Beginner', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  'intermediate': { label: 'Intermediate', color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  'expert': { label: 'Mastery', color: 'bg-rose-500/10 text-rose-600 border-rose-200' }
}

function PublicQuizzesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [quizzes, setQuizzes] = useState<PublicQuiz[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPublicQuizzes = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get<PublicQuiz[]>('/public_quizzes')
      setQuizzes(data)
    } catch (error) {
      message.error('Failed to load public quizzes')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPublicQuizzes()
  }, [fetchPublicQuizzes])

  // Search filter
  const [searchQuery] = useState('')
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(q => {
      const title = (q.topic || q.material_file_name || '').toLowerCase()
      const owner = (q.user_owner?.full_name || q.user_owner?.email || '').toLowerCase()
      return title.includes(searchQuery.toLowerCase()) || owner.includes(searchQuery.toLowerCase())
    })
  }, [quizzes, searchQuery])

  const handleAttempt = useCallback((quizId: string) => {
    Modal.confirm({
      title: 'Attempt Community Quiz',
      content: 'This will add the quiz to your personal library and start a new session. Do you want to proceed?',
      okText: 'Yes, Attempt',
      cancelText: 'Cancel',
      okButtonProps: { className: 'bg-indigo-600 hover:bg-indigo-700 border-none' },
      onOk: async () => {
        try {
          await api.post(`/public_quizzes/${quizId}/sessions`)
          message.success('Quiz added to your library!')
          navigate({ to: '/dashboard/quizzes/start/$uuid', params: { uuid: quizId } })
        } catch (error) {
          console.error(error)
          message.error('Failed to start quiz session')
        }
      }
    })
  }, [navigate])

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-20"
    >
      {/* Page Header */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 text-[10px] font-black uppercase tracking-widest mb-4">
            <Globe className="w-3 h-3" />
            Community
          </div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight leading-none">
            Explore Quizzes
          </h2>
          <p className="text-slate-500 text-sm font-medium mt-3">Discover and attempt quizzes shared by the community.</p>
        </div>
      </motion.div>

      {/* Quizzes List (Grid) */}
      <motion.div variants={item} className="flex flex-col gap-6">
        {/* <div className="flex items-center justify-between">
          <div className="relative group w-full max-w-sm">
            <Search strokeWidth={1.5} className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic or creator..."
              className="w-full pl-11 pr-6 py-3 bg-white border border-slate-200 rounded-[1.25rem] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-medium shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-3 bg-white border border-slate-200 rounded-[1.25rem] text-slate-500 hover:text-indigo-600 transition-all shadow-sm flex items-center gap-2 text-sm font-semibold">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div> */}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 h-64 shadow-sm flex flex-col justify-between">
                <Skeleton active title={false} paragraph={{ rows: 3 }} />
                <Skeleton.Avatar active shape="circle" size="default" />
              </div>
            ))}
          </div>
        ) : filteredQuizzes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map(quiz => {
              const diffConfig = complexityMap[quiz.difficulty_level] || { label: quiz.difficulty_level, color: 'bg-slate-100 text-slate-700 border-slate-200' }
              const title = quiz.topic || quiz.material_file_name || 'Untitled Quiz'

              const content = (
                <>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <span className={`inline-flex px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${diffConfig.color} ${quiz.is_attempt ? 'opacity-60' : ''}`}>
                        {diffConfig.label}
                      </span>
                      <div className="flex items-center gap-1 text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                        <Layers className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold">{quiz.question_count}</span>
                      </div>
                    </div>

                    <div>
                      <h3 className={`text-lg font-bold leading-snug line-clamp-2 transition-colors ${quiz.is_attempt ? 'text-slate-500' : 'text-slate-800 group-hover:text-indigo-600'}`}>
                        {title}
                      </h3>
                      <div className="text-slate-500 text-xs font-medium mt-2 flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Community Quiz</span>
                        </div>

                        {quiz.is_attempt && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              Already in your quizzes
                            </span>
                          </>
                        )}

                        {quiz.user_owner && quiz.user_owner.email === user?.email && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                              <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" />
                              You are the owner
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {quiz.user_owner?.avatar_url ? (
                        <img
                          src={quiz.user_owner.avatar_url}
                          alt={quiz.user_owner.full_name || 'Creator'}
                          className={`w-8 h-8 rounded-full border border-slate-200 shadow-sm object-cover ${quiz.is_attempt ? 'grayscale opacity-60' : ''}`}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Creator</span>
                        <span className={`text-sm font-semibold truncate max-w-[120px] ${quiz.is_attempt ? 'text-slate-500' : 'text-slate-700'}`}>
                          {quiz.user_owner?.full_name || quiz.user_owner?.email?.split('@')[0] || 'Anonymous'}
                        </span>
                      </div>
                    </div>

                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${quiz.is_attempt
                      ? 'bg-emerald-50 text-emerald-500 border border-emerald-100'
                      : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white'
                      }`}>
                      {quiz.is_attempt ? <Check className="w-4 h-4" /> : ((quiz.user_owner && quiz.user_owner.email === user?.email) ? <BadgeCheck className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />)}
                    </div>
                  </div>
                </>
              )

              if (quiz.is_attempt) {
                return (
                  <div
                    key={quiz.quiz_id}
                    className="relative flex flex-col justify-between bg-slate-50/50 p-6 rounded-[2rem] border border-slate-200/40 shadow-sm cursor-not-allowed"
                  >
                    {content}
                  </div>
                )
              }

              if (quiz.user_owner && quiz.user_owner.email === user?.email) {
                return (
                  <div
                    key={quiz.quiz_id}
                    className="group relative flex flex-col justify-between bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-indigo-500/20 hover:-translate-y-1 transition-all duration-300"
                  >
                    {content}
                  </div>
                )
              }

              return (
                <div
                  key={quiz.quiz_id}
                  onClick={() => handleAttempt(quiz.quiz_id)}
                  className="group relative flex flex-col justify-between bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-indigo-500/20 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                >
                  {content}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-24 px-8 bg-white border border-slate-200/60 rounded-[2.5rem] flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 border border-slate-100">
              <Sparkles className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">No public quizzes found</h3>
            <p className="text-slate-500 font-medium max-w-xs mx-auto">
              {searchQuery ? "Try adjusting your search criteria." : "Check back soon! Community members will be sharing their quizzes here."}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
