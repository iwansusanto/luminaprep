import React from 'react';
import { ConfigProvider } from 'antd';
import Sidebar from './Sidebar';
import Header from './Header';
import { ChatBot } from './ChatBot';
import { useAuth } from '../../context/AuthContext';
import { useRouterState } from '@tanstack/react-router';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Extracts chatbot context from the current route pathname.
 * - /dashboard/quizzes/start/:uuid   → quizId = uuid
 * - /dashboard/quizzes/retake/:uuid  → quizId = uuid
 * - /dashboard/quizzes/continue/:uuid → quizId = uuid
 * - /dashboard/quizzes/result/:id    → no quiz context (session done)
 * - /dashboard/materials             → no specific material context (list page)
 * All other pages → just projectId
 */
function useChatContext(projectId: string | undefined) {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  // Match quiz session pages: /dashboard/quizzes/(start|retake|continue)/:uuid
  const quizSessionMatch = pathname.match(
    /\/dashboard\/quizzes\/(start|retake|continue)\/([^/]+)/
  );
  if (quizSessionMatch) {
    return { projectId, quizId: quizSessionMatch[2], materialId: undefined };
  }

  return { projectId, quizId: undefined, materialId: undefined };
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const projectId = user?.projects?.[0]?.id;
  const { quizId, materialId } = useChatContext(projectId);

  return (
    <ConfigProvider
      theme={{
        token: {
          fontFamily: 'Outfit, sans-serif',
          colorPrimary: '#4f46e5',
          borderRadius: 16,
          colorBgContainer: '#ffffff',
        },
        components: {
          Button: {
            controlHeight: 40,
            fontWeight: 600,
          },
          Input: {
            controlHeight: 44,
          },
        },
      }}
    >
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
        <ChatBot
          projectId={projectId}
          quizId={quizId}
          materialId={materialId}
        />
      </div>
    </ConfigProvider>
  );
};

export default DashboardLayout;
