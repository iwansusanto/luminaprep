import { createFileRoute, Link, useNavigate, redirect } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import bgImage from '@/assets/bg-abstract.png'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        })
        const userInfo = await res.json()
        auth.login({
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
        })
        navigate({ to: '/dashboard' })
      } catch (err) {
        console.error('Failed to fetch user info', err)
      }
    },
    onError: () => {
      console.error('Google Login Failed')
    }
  })

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col relative font-sans overflow-hidden">
      {/* Background Image Layer */}
      <div
        className="fixed inset-0 z-0 opacity-30 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgImage})` }}
      ></div>
      <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-b from-[#020617]/80 via-[#020617] to-[#020617]"></div>

      {/* Navigation Bar (Minimal) */}
      <nav className="relative z-10 w-full p-6">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </nav>

      {/* Login Container */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Glass Card */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            {/* Glow effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-blue-500/10 blur-[50px] rounded-full pointer-events-none"></div>

            <div className="flex flex-col items-center text-center space-y-6">
              {/* Logo */}
              <div className="flex items-center gap-3 mb-2">
                <img src="/logo.jpg" alt="LuminaPrep Logo" className="w-10 h-10 rounded-xl shadow-lg shadow-blue-600/30 object-cover" />
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  LuminaPrep
                </span>
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h1>
                <p className="text-sm text-slate-400">
                  Log in to access your personalized learning dashboard
                </p>
              </div>

              {/* Login Button */}
              <div className="w-full pt-4">
                <button 
                  onClick={() => handleGoogleLogin()}
                  className="w-full relative group flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-900 px-6 py-3.5 rounded-2xl font-medium transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)] active:scale-[0.98]"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>

              {/* Terms */}
              <p className="text-xs text-slate-500 pt-4">
                By continuing, you agree to LuminaPrep's{' '}
                <Link to="/term-of-service" className="text-slate-400 hover:text-white underline decoration-slate-600 underline-offset-2">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy-policy" className="text-slate-400 hover:text-white underline decoration-slate-600 underline-offset-2">Privacy Policy</Link>.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
