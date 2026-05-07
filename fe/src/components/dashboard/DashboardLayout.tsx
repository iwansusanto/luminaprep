import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#F8FAFB] font-sans noise-bg">
      <Sidebar />
      <div className="pl-72 pr-4 transition-all duration-500">
        <Header />
        <main className="pt-28 pb-12 min-h-screen">
          <div className="max-w-[1440px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};


export default DashboardLayout;
