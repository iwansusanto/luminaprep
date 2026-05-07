import React from 'react';
import { Bell, Search, Plus, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Header = () => {
  const auth = useAuth();

  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 fixed top-0 right-0 left-64 z-30 px-8 flex items-center justify-between">
      {/* Welcome Section */}
      <div>
        <h1 className="text-xl font-semibold text-slate-800">
          Welcome back, {auth?.user?.name?.split(' ')[0] || 'User'}! 👋
        </h1>
        <p className="text-sm text-slate-500">Let's continue your learning journey today.</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-6">


        {/* Upload Button */}
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-all shadow-md shadow-indigo-100 active:scale-95">
          <Plus className="w-4 h-4" />
          <span>Upload Material</span>
        </button>

        {/* Notifications */}
        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 border-2 border-white rounded-full"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-6 border-l border-slate-200 group cursor-pointer">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-800 leading-none">{auth?.user?.name}</p>
            <p className="text-xs text-slate-500 mt-1">{auth?.user?.email}</p>
          </div>
          <div className="relative">
            <img
              src={auth?.user?.picture || 'https://ui-avatars.com/api/?name=' + auth?.user?.name}
              alt="Profile"
              className="w-10 h-10 rounded-full border-2 border-slate-100 group-hover:border-indigo-500 transition-all object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border border-slate-200">
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
