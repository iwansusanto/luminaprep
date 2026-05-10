import React from 'react'
import { motion, type Variants } from 'framer-motion'
import { 
  UploadCloud, 
  LayoutGrid, 
  Link as LinkIcon, 
  Type 
} from 'lucide-react'

interface MaterialUploaderProps {
  variants?: Variants
  className?: string
}

export const MaterialUploader: React.FC<MaterialUploaderProps> = ({ variants, className }) => {
  return (
    <motion.div 
      variants={variants} 
      className={className || "lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200/60 p-10 shadow-sm relative overflow-hidden group"}
    >
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
        <UploadCloud className="w-64 h-64 text-indigo-600" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h3 className="text-xl font-black text-slate-800">Add Study Material</h3>
            <p className="text-sm text-slate-500 font-medium">Upload or paste content to start learning.</p>
          </div>
          <div className="flex gap-2">
            <button className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors border border-slate-200/50">
              <LayoutGrid className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          <div className="md:col-span-3 border-2 border-dashed border-slate-200 rounded-[2rem] p-10 flex flex-col items-center justify-center gap-6 hover:border-indigo-400 hover:bg-indigo-50/20 transition-all cursor-pointer group/upload">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center group-hover/upload:scale-110 group-hover/upload:rotate-3 transition-all duration-500 shadow-indigo-100 shadow-xl">
              <UploadCloud className="w-10 h-10" />
            </div>
            <div className="text-center">
              <p className="font-black text-slate-800 text-lg">Drop files here</p>
              <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">or click to browse local storage</p>
            </div>
            <div className="flex gap-2">
              {['PDF', 'DOCX', 'PPT'].map(ext => (
                <span key={ext} className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{ext}</span>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col gap-4">
            <div className="p-1 bg-slate-100/50 rounded-2xl border border-slate-200/40">
              <button className="flex items-center gap-4 w-full p-4 bg-white hover:bg-slate-50 rounded-xl transition-all shadow-sm border border-slate-200/50 group/btn">
                <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                  <LinkIcon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-slate-800">Add Link</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Websites / Articles</p>
                </div>
              </button>
            </div>
            <div className="p-1 bg-slate-100/50 rounded-2xl border border-slate-200/40">
              <button className="flex items-center gap-4 w-full p-4 bg-white hover:bg-slate-50 rounded-xl transition-all shadow-sm border border-slate-200/50 group/btn">
                <div className="w-10 h-10 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center group-hover/btn:scale-110 transition-transform">
                  <Type className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-slate-800">Paste Text</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Manual Input</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
