import { createFileRoute, Link, useNavigate, redirect } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'

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
        await auth.login({
          email: userInfo.email,
          name: userInfo.name,
          avatar_url: userInfo.picture,
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
    <div className="min-h-screen bg-[#FAFAFA] text-[#09090B] font-sans">
      {/* Structured Grid Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, #E4E4E7 1px, transparent 1px),
            linear-gradient(to bottom, #E4E4E7 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
          opacity: 0.4
        }}></div>
      </div>

      {/* Navigation Bar */}
      <nav className="relative z-10 w-full p-6">
        <Link to="/" className="inline-flex items-center gap-2 text-[#71717A] hover:text-[#09090B] transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </nav>

      {/* Login Container */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-12">
          {/* Left Side - Brand Identity */}
          <motion.div
            className="flex-1 hidden lg:flex flex-col justify-center"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="space-y-12">
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <img src="https://res.cloudinary.com/dfwutfkbn/image/upload/v1778865007/c53281de-f18c-45fa-ae3d-bdd4cbb95e85.png" alt="LuminaPrep Logo" className="w-12 h-12 rounded-lg object-cover" />
                  <span className="text-2xl font-semibold tracking-tight text-[#09090B]">
                    LuminaPrep
                  </span>
                </div>
                <blockquote className="text-3xl font-light leading-relaxed text-[#09090B]">
                  "The best way to predict the future is to create it."
                </blockquote>
                <cite className="block mt-4 text-sm text-[#71717A] not-italic">
                  — Peter Drucker
                </cite>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Login Form */}
          <motion.div
            className="flex-1 w-full max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-white border border-[#E4E4E7] rounded-xl p-8 shadow-sm">
              <div className="space-y-8">
                {/* Header */}
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight mb-2 text-[#09090B]">
                    Continue with Google
                  </h1>
                  <p className="text-sm text-[#71717A]">
                    Transform your learning materials into interactive study suites.
                  </p>
                </div>

                {/* Google Login Button */}
                <button 
                  onClick={() => handleGoogleLogin()}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-[#FAFAFA] text-[#09090B] px-4 py-3 rounded-lg font-medium text-sm border border-[#E4E4E7] hover:border-[#09090B] transition-all duration-200"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#E4E4E7]"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-[#71717A]">or</span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-4">
                  {[
                    "Context-aware RAG ingestion",
                    "Adaptive quiz generation",
                    "Real-time progress analytics"
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-1.5 h-1.5 bg-[#0066FF] rounded-full flex-shrink-0"></div>
                      <span className="text-[#71717A]">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Terms */}
                <p className="text-xs text-[#71717A] leading-relaxed">
                  By continuing, you agree to our{' '}
                  <Link to="/term-of-service" className="text-[#09090B] hover:underline">Terms</Link>
                  {' '}and{' '}
                  <Link to="/privacy-policy" className="text-[#09090B] hover:underline">Privacy Policy</Link>.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
