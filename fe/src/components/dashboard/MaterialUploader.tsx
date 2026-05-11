import React, { useRef, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import {
  UploadCloud,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle
} from 'lucide-react'
import { notification, message } from 'antd'
import { setting_material } from '../../lib/utils'

interface MaterialUploaderProps {
  variants?: Variants
  className?: string
  projectId?: string
  currentCount?: number
  onUploadSuccess?: () => void
}

export const MaterialUploader: React.FC<MaterialUploaderProps> = ({ variants, className, projectId, currentCount, onUploadSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const isLimitReached = currentCount !== undefined && currentCount >= setting_material.maximal;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;

    if (file.type !== 'application/pdf') {
      message.error('Only PDF files are allowed for this MVP.');
      return;
    }

    if (isLimitReached) {
      notification.warning({
        message: 'Upload Limit Reached',
        description: `You have reached the maximum limit of ${setting_material.maximal} materials. Please remove some materials to upload new ones.`,
        placement: 'topRight',
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setIsUploading(true);

    try {
      const response = await fetch(`/api/v1/materials/upload?project_id=${projectId}`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        notification.success({
          message: 'Intelligence Uploaded',
          description: 'Your material has been successfully synchronized and is ready for analysis.',
          placement: 'topRight',
          icon: <CheckCircle className="w-6 h-6 text-emerald-500" />,
          className: 'premium-notification',
        });
        if (onUploadSuccess) onUploadSuccess();
      } else {
        notification.error({
          message: 'Upload Failed',
          description: 'We encountered an error while processing your material. Please try again.',
          placement: 'topRight',
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('An error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div
      variants={variants}
      className={className || "lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200/60 p-10 shadow-sm relative overflow-hidden group spotlight-card"}
    >
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
        <UploadCloud className="w-64 h-64 text-indigo-600" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Add Study Material</h3>
            <p className="text-sm text-slate-500 font-medium">Power up your learning with PDF documents.</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100/50">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".pdf"
          onChange={handleFileChange}
        />

        <div
          onClick={() => !isUploading && !isLimitReached && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-[2.5rem] p-16 flex flex-col items-center justify-center gap-6 transition-all relative overflow-hidden ${isUploading ? 'cursor-wait border-slate-200 bg-slate-50/30' : 
              isLimitReached ? 'cursor-not-allowed border-rose-100 bg-rose-50/30' : 
              'border-slate-200 bg-slate-50/30 hover:border-indigo-400 hover:bg-indigo-50/20 cursor-pointer group/upload'
            }`}
        >
          {isUploading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/10 border border-indigo-100">
                <Loader2 className="w-10 h-10 animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-black text-slate-800 text-lg">Uploading Insight...</p>
                <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-[0.2em]">Synchronizing with your vault</p>
              </div>
            </motion.div>
          ) : isLimitReached ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center shadow-xl shadow-rose-500/10 border border-rose-100">
                <AlertCircle className="w-12 h-12" />
              </div>
              <div className="text-center">
                <p className="font-black text-rose-600 text-xl">Limit Reached</p>
                <p className="text-xs text-rose-400 mt-2 font-bold uppercase tracking-[0.2em]">Remove materials to free up slots</p>
              </div>
            </motion.div>
          ) : (
            <>
              <div className="w-24 h-24 bg-white text-indigo-600 rounded-3xl flex items-center justify-center group-hover/upload:scale-110 group-hover/upload:rotate-3 transition-all duration-500 shadow-xl shadow-indigo-500/10 border border-slate-100">
                <UploadCloud className="w-12 h-12" />
              </div>
              <div className="text-center">
                <p className="font-black text-slate-800 text-xl">Drop your PDF here</p>
                <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-[0.2em]">or click to browse documents</p>
              </div>
            </>
          )}

          <div className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-[10px] font-bold uppercase tracking-wider ${
            isLimitReached ? 'bg-rose-100 border-rose-200 text-rose-700' : 'bg-amber-50 border-amber-100 text-amber-700'
          }`}>
            <AlertCircle className="w-3.5 h-3.5" />
            {isLimitReached ? 'Maximum Capacity Reached' : 'PDF Only for MVP'}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-8">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xl font-black text-slate-800">100MB</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Max Size</span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-xl font-black text-slate-800">{Math.max(0, setting_material.maximal - (currentCount || 0))}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Slots Left</span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-xl font-black text-slate-800">{setting_material.maximal}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Limit</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
