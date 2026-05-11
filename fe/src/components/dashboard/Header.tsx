import { useState, useEffect, useCallback } from 'react';
import { Bell, Search, Plus, ChevronDown, Settings, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { Modal } from 'antd';
import { MaterialUploader } from './MaterialUploader';

const Header = () => {
  const auth = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [materialsCount, setMaterialsCount] = useState(0);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const projectId = auth?.user?.projects?.[0]?.id;

  const fetchMaterialsCount = useCallback(async () => {
    if (!projectId) return;
    try {
      const response = await fetch(`/api/v1/materials/project/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setMaterialsCount(Array.isArray(data.materials) ? data.materials.length : 0);
      }
    } catch (error) {
      console.error('Failed to fetch materials count for header:', error);
    }
  }, [projectId]);

  useEffect(() => {
    if (isModalOpen) {
      fetchMaterialsCount();
    }
  }, [isModalOpen, fetchMaterialsCount]);

  return (
    <header className="h-20 bg-white/60 backdrop-blur-xl border-b border-slate-200/50 fixed top-4 right-4 left-[18rem] z-30 px-8 flex items-center justify-between rounded-3xl shadow-sm">
      {/* Left: Context */}
      <div className="flex items-center gap-6">
        <div className="hidden lg:flex flex-col">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">
            <Calendar className="w-3 h-3" />
            {today}
          </div>
          <h1 className="text-lg font-black text-slate-800 leading-none">
            Dashboard
          </h1>
        </div>

        <div className="h-8 w-[1px] bg-slate-200 hidden lg:block" />

        <div className="relative group hidden md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="Search materials, quizzes..."
            className="pl-12 pr-6 py-2.5 bg-slate-100/50 border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 rounded-2xl text-sm w-72 transition-all outline-none font-medium"
          />
        </div>
      </div>

      {/* Right: Actions & User */}
      <div className="flex items-center gap-4">
        {/* Quick Actions */}
        <div className="flex items-center gap-2 p-1 bg-slate-100/50 rounded-2xl border border-slate-200/40">
          <button className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded-xl transition-all relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 border-2 border-white rounded-full animate-pulse"></span>
          </button>
          <button className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded-xl transition-all">
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-slate-900 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-slate-900/10 active:scale-95 group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          <span>New Material</span>
        </button>

        <Modal
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          centered
          width={800}
          style={{ borderRadius: '2.5rem', overflow: 'hidden' }}
          styles={{
            mask: { backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15, 23, 42, 0.4)' },
            body: { padding: 0 }
          }}
          closeIcon={null}
        >
          <MaterialUploader 
            className="bg-white p-10 relative overflow-hidden" 
            projectId={projectId}
            currentCount={materialsCount}
            onUploadSuccess={() => {
              fetchMaterialsCount();
              setIsModalOpen(false);
            }}
          />
        </Modal>

        <div className="w-[1px] h-8 bg-slate-200 ml-2" />

        {/* User Profile */}
        <motion.div
          whileHover={{ x: 2 }}
          className="flex items-center gap-3 pl-2 group cursor-pointer"
        >
          <div className="text-right hidden sm:block">
            <p className="text-xs font-black text-slate-800 leading-none">{auth?.user?.full_name || 'Alex Putra'}</p>
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-tighter mt-1">Student Plan</p>
          </div>
          <div className="relative">
            <img
              src={auth?.user?.avatar_url || 'https://ui-avatars.com/api/?name=' + (auth?.user?.full_name || 'User')}
              alt="Profile"
              className="w-10 h-10 rounded-2xl border-2 border-white shadow-md group-hover:shadow-indigo-200 transition-all object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-1 -right-1 bg-white rounded-lg p-0.5 border border-slate-100 shadow-sm">
              <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 transition-colors" />
            </div>
          </div>
        </motion.div>
      </div>
    </header>
  );
};

export default Header;
