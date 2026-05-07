import React from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  LayoutDashboard,
  BookOpen,
  BrainCircuit,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
  const auth = useAuth();
  const navigate = useNavigate();

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
    <aside className="w-64 h-screen bg-[#F8FAFC] border-r border-slate-200 flex flex-col fixed left-0 top-0 z-40">
      {/* Brand */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg">
          <BrainCircuit className="text-white w-6 h-6" />
        </div>
        <span className="text-xl font-bold text-slate-800 tracking-tight">LuminaPrep</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 mt-4">
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.to}
            activeProps={{ className: 'bg-indigo-50 text-indigo-600' }}
            inactiveProps={{ className: 'text-slate-500 hover:bg-slate-100 hover:text-slate-700' }}
            className="flex items-center justify-between px-4 py-3 rounded-xl transition-all group font-medium"
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span>{item.name}</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all font-medium group"
        >
          <LogOut className="w-5 h-5 transition-transform group-hover:rotate-12" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
