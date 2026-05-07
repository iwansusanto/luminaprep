import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import bgImage from '@/assets/bg-abstract.png'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const auth = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await auth.logout()
    navigate({ to: '/' })
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col relative font-sans overflow-hidden">
      {/* Background Image Layer */}
      <div
        className="fixed inset-0 z-0 opacity-20 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgImage})` }}
      ></div>
      <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-b from-[#020617]/90 via-[#020617] to-[#020617]"></div>

      {/* Header */}
      <header className="relative z-10 w-full p-6 border-b border-white/5 bg-[#020617]/50 backdrop-blur-xl flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="LuminaPrep Logo" className="w-8 h-8 rounded-lg shadow-lg object-cover" />
          <span className="text-xl font-bold text-white">LuminaPrep</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </header>

      {/* Dashboard Content */}
      <main className="relative z-10 flex-1 p-6 md:p-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome, {auth.user?.name?.split(' ')[0]}!</h1>
            <p className="text-slate-400">Here is your account overview.</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-6">Profile Information</h2>

            <div className="flex flex-col md:flex-row items-center gap-8">
              <img
                src={auth.user?.picture || 'https://via.placeholder.com/150'}
                alt="Profile"
                referrerPolicy="no-referrer"
                className="w-24 h-24 rounded-full border-4 border-blue-500/30 shadow-lg object-cover"
              />
              <div className="space-y-4 w-full">
                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Full Name</div>
                  <div className="text-lg text-white font-medium">{auth.user?.name}</div>
                </div>
                <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Email Address</div>
                  <div className="text-lg text-white font-medium">{auth.user?.email}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
