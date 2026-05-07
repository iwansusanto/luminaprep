import { createFileRoute } from '@tanstack/react-router'
import { motion, type Variants } from 'framer-motion'
import { ChevronRight, Clock, Info, CheckCircle2, ChevronLeft, Sparkles } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/dashboard/quizzes/start/$uuid')({
  component: StartQuizPage,
})

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const item: Variants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } }
}

function StartQuizPage() {
  const { uuid } = Route.useParams()
  const [currentQuestion, setCurrentQuestion] = useState(1)
  const totalQuestions = 10

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-4xl mx-auto space-y-8 pt-4 pb-20"
    >
      {/* Header / Progress */}
      <motion.div variants={item} className="bg-white/50 backdrop-blur-md border border-slate-200/60 rounded-[2rem] p-6 shadow-sm flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 leading-none mb-1">New Assessment</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quiz ID: {uuid.slice(0, 8)}...</p>
          </div>
        </div>

        <div className="flex-1 max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initial Progress</span>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{currentQuestion}/{totalQuestions}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(currentQuestion / totalQuestions) * 100}%` }}
              className="h-full bg-emerald-500 rounded-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-black tracking-widest">Time: 00:45</span>
        </div>
      </motion.div>

      {/* Question Card */}
      <motion.div variants={item} className="bg-white border border-slate-200/60 rounded-[2.5rem] p-12 shadow-xl shadow-emerald-500/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
          <Sparkles className="w-64 h-64 text-emerald-600" />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-6">
            <Info className="w-3 h-3" />
            Beginner Level
          </div>

          <h3 className="text-2xl font-black text-slate-800 leading-snug mb-10 max-w-2xl">
            In the study of World Geography, which of the following best defines the term 'Plate Tectonics' in relation to mountain formation?
          </h3>

          <div className="grid grid-cols-1 gap-4">
            {[
              'The slow movement of the Earth\'s lithospheric plates that creates geological features.',
              'The process of erosion caused by extreme weather conditions over thousands of years.',
              'The seasonal migration of terrestrial animals across different continental shelf regions.',
              'The chemical reaction between oceanic saltwater and volcanic rocks in the deep sea.'
            ].map((option, i) => (
              <button
                key={i}
                className="flex items-center justify-between p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:border-emerald-500 hover:bg-emerald-50/50 hover:shadow-md transition-all group/opt text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400 group-hover/opt:border-emerald-500 group-hover/opt:text-emerald-600 transition-colors">
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="text-sm font-semibold text-slate-600 group-hover/opt:text-slate-800 transition-colors">{option}</span>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-500 opacity-0 group-hover/opt:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Navigation Buttons */}
      <motion.div variants={item} className="flex items-center justify-between">
        <button
          onClick={() => setCurrentQuestion(prev => Math.max(1, prev - 1))}
          className="flex items-center gap-2 px-6 py-4 text-slate-400 hover:text-slate-800 transition-all font-black uppercase tracking-widest text-xs"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <div className="flex gap-4">
          <button className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all">
            Quit
          </button>
          <button
            onClick={() => setCurrentQuestion(prev => Math.min(totalQuestions, prev + 1))}
            className="flex items-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-500 transition-all shadow-xl shadow-slate-900/10 active:scale-95 group"
          >
            {currentQuestion === totalQuestions ? 'Finish Quiz' : 'Next Question'}
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
