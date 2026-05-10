import { useState } from 'react';
import { Link, useNavigate, useLocation } from '@tanstack/react-router';
import { ComingSoonModal } from './ComingSoonModal';
import {
  LayoutDashboard,
  BookOpen,
  BrainCircuit,
  LogOut,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';

const Sidebar = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const handleLogout = async () => {
    await auth?.logout();
    navigate({ to: '/' });
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { name: 'My Materials', icon: BookOpen, to: '/dashboard/materials' },
    { name: 'My Quizzes', icon: BrainCircuit, to: '/dashboard/quizzes' },
  ];

  return (
    <aside className="w-64 h-[calc(100vh-2rem)] m-4 bg-white/80 backdrop-blur-xl border border-slate-200/60 flex flex-col fixed left-0 top-0 z-40 rounded-[2rem] shadow-2xl shadow-indigo-500/5">
      {/* Brand */}
      <Link to="/dashboard" className="p-8 flex items-center gap-4 group/logo cursor-pointer">
        <div className="relative group">
          <div className="absolute -inset-2 bg-indigo-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <img
            src="/logo.jpg"
            alt="LuminaPrep Logo"
            className="w-10 h-10 rounded-2xl shadow-xl object-cover relative z-10 border border-white/50 group-hover/logo:scale-105 transition-transform duration-500"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-black text-slate-800 tracking-tight leading-none group-hover/logo:text-indigo-600 transition-colors">LuminaPrep</span>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2 mt-4">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4 mb-4">Main Menu</div>
        {navItems.map((item) => {
          const isActive = item.to === '/dashboard'
            ? location.pathname === '/dashboard'
            : location.pathname.startsWith(item.to);

          return (
            <Link
              key={item.name}
              to={item.to}
              className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden ${isActive
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
            >
              <div className="flex items-center gap-3 relative z-10">
                <item.icon className={`w-5 h-5 transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:rotate-6'}`} />
                <span className="font-semibold text-sm">{item.name}</span>
              </div>
              {!isActive && <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />}
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 -z-10"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Premium Upgrade Card */}
      <div className="px-4 mb-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-5 relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-indigo-500/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
          <div className="relative z-10">
            <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center mb-3">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <p className="text-xs font-bold text-white mb-1">Go Pro</p>
            <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">Unlock unlimited AI quizzes and deep analytics.</p>
            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              className="w-full py-2 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-50 transition-colors"
            >
              Upgrade
            </button>
          </div>
        </div>
      </div>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all duration-300 font-bold text-sm group"
        >
          <LogOut className="w-5 h-5 transition-transform duration-500 group-hover:-translate-x-1" />
          <span>Sign Out</span>
        </button>
      </div>
      <ComingSoonModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </aside>
  );
};

export default Sidebar;
