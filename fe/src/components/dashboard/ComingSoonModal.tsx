import React from 'react'
import { Modal } from 'antd'
import { Sparkles } from 'lucide-react'

interface ComingSoonModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ComingSoonModal: React.FC<ComingSoonModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      centered
      width={400}
      style={{ borderRadius: '2.5rem', overflow: 'hidden' }}
      styles={{
        mask: { backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15, 23, 42, 0.4)' },
        body: { padding: '2.5rem' }
      }}
      closeIcon={null}
    >
      <div className="text-center relative">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Sparkles className="w-8 h-8" />
        </div>

        <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Coming Soon!</h3>
        <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
          Our premium AI engine is currently in training. You'll be the first to know when advanced analytics and unlimited generations are live.
        </p>

        <div className="space-y-3 mb-8">
          {[
            'Unlimited Quiz Generations',
            'Advanced Learning Analytics',
            'Priority AI Processing',
            'Custom Study Roadmaps'
          ].map((feature, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{feature}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
        >
          Got it, thanks!
        </button>
      </div>
    </Modal>
  )
}
