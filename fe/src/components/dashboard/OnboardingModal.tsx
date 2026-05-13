import React, { useState } from 'react';
import { Modal, Input, Button, message } from 'antd';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { Sparkles, Layout, AlignLeft } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const projectSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title is too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description is too long'),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface OnboardingModalProps {
  isVisible: boolean;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isVisible }) => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      description: '',
    },
  });

  const onSubmit = async (data: ProjectFormData) => {
    setLoading(true);
    try {
      await api.post('/projects/', data);
      message.success('Project created successfully! Welcome to LuminaPrep.');
      // Refresh session to update projects list
      await session();
    } catch (error: any) {
      message.error(error.message || 'Failed to create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isVisible}
      closable={false}
      footer={null}
      centered
      width={600}
      className="onboarding-modal overflow-hidden"
      styles={{
        mask: {
          backdropFilter: 'blur(16px)',
          background: 'rgba(15, 23, 42, 0.4)',
        },
      }}
      modalRender={(node) => (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            type: 'spring',
            damping: 20,
            stiffness: 100,
          }}
          className="relative overflow-hidden rounded-[2.5rem] bg-white/90 backdrop-blur-3xl border border-white/50 shadow-[0_32px_64px_-16px_rgba(31,38,135,0.15)] noise-bg"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
          {node}
        </motion.div>
      )}
    >
      <div className="p-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center text-center mb-12"
        >
          <div className="w-24 h-24 bg-white rounded-[2.25rem] flex items-center justify-center shadow-2xl shadow-indigo-600/10 mb-8 relative group overflow-hidden border border-slate-100">
            <img
              src="/logo.jpg"
              alt="LuminaPrep Logo"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 5, 0]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-2 -right-2"
            >
            </motion.div>
          </div>

          <h2 className="text-4xl font-black text-slate-800 tracking-[-0.03em] leading-[1.1] mb-4">
            Let's architect your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">First Project</span>
          </h2>
          <p className="text-slate-500 font-medium max-w-[320px] leading-relaxed text-base opacity-80">
            Your learning journey deserves a home. Start by giving it a meaningful name.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-3"
            >
              <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-[0.25em] px-1 flex items-center gap-2">
                <Layout className="w-3.5 h-3.5 text-indigo-500" /> Project Title
              </label>
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="e.g., Clinical Neurology 2026"
                    className={`h-16 px-8 rounded-2xl bg-white/50 border-slate-200/60 hover:border-indigo-400 focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 transition-all duration-300 font-bold text-lg text-slate-800 placeholder:text-slate-300 ${errors.title ? 'border-red-400 ring-red-500/5' : ''}`}
                  />
                )}
              />
              {errors.title && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-[11px] font-bold mt-2 px-1">{errors.title.message}</motion.p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-[0.25em] px-1 flex items-center gap-2">
                <AlignLeft className="w-3.5 h-3.5 text-indigo-500" /> Purpose & Context
              </label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Input.TextArea
                    {...field}
                    placeholder="What are your goals for this study period?"
                    rows={4}
                    className={`px-8 py-6 rounded-2xl bg-white/50 border-slate-200/60 hover:border-indigo-400 focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/5 transition-all duration-300 font-medium text-slate-600 leading-relaxed text-base placeholder:text-slate-300 ${errors.description ? 'border-red-400 ring-red-500/5' : ''}`}
                  />
                )}
              />
              {errors.description && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-[11px] font-bold mt-2 px-1">{errors.description.message}</motion.p>
              )}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              disabled={!isValid}
              className="w-full h-20 bg-indigo-600 hover:bg-indigo-500 border-none rounded-3xl text-sm font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_-10px_rgba(79,70,229,0.4)] flex items-center justify-center gap-4 active:scale-[0.97] transition-all duration-300 disabled:opacity-40 disabled:bg-slate-300 disabled:shadow-none"
            >
              Begin Your Journey <Sparkles className="w-5 h-5 fill-current" />
            </Button>
          </motion.div>
        </form>
      </div>
    </Modal>
  );
};
