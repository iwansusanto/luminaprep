import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/term-of-service')({
  component: TermOfServicePage,
})

function TermOfServicePage() {
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

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-[#E4E4E7] bg-[#FAFAFA]/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <img src="https://res.cloudinary.com/dfwutfkbn/image/upload/v1778865007/c53281de-f18c-45fa-ae3d-bdd4cbb95e85.png" alt="LuminaPrep Logo" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-lg font-semibold tracking-tight text-[#09090B]">
              LuminaPrep
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#71717A]">
            <Link to="/login" className="hover:text-[#09090B] transition-colors">Sign in</Link>
            <Link to="/login" className="bg-[#09090B] text-white px-5 py-2 rounded-lg hover:bg-[#18181B] transition-colors">
              Get Started free
            </Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 pt-32 pb-24">
        <div className="container mx-auto px-4">
          <motion.div 
            className="max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link to="/" className="inline-flex items-center gap-2 text-[#71717A] hover:text-[#09090B] transition-colors mb-12 text-sm font-medium group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Home</span>
            </Link>
            
            <h1 className="text-5xl font-black text-[#09090B] tracking-tight mb-4">Terms of Service</h1>
            <p className="text-[#71717A] mb-12 text-lg">Last updated: May 16, 2026</p>
            
            <div className="bg-white border border-[#E4E4E7] rounded-2xl p-8 md:p-12 shadow-sm space-y-12">
              <section>
                <h2 className="text-xl font-bold text-[#09090B] mb-4 flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-[#FAFAFA] border border-[#E4E4E7] rounded-lg flex items-center justify-center font-mono text-xs text-[#71717A]">01</span>
                  Acceptance of Terms
                </h2>
                <p className="text-[#71717A] leading-relaxed pl-11">
                  By accessing or using the LuminaPrep platform, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these terms, you may not use our services.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-[#09090B] mb-4 flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-[#FAFAFA] border border-[#E4E4E7] rounded-lg flex items-center justify-center font-mono text-xs text-[#71717A]">02</span>
                  Use License
                </h2>
                <p className="text-[#71717A] leading-relaxed pl-11">
                  Permission is granted to temporarily download one copy of the materials (information or software) on LuminaPrep's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-[#09090B] mb-4 flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-[#FAFAFA] border border-[#E4E4E7] rounded-lg flex items-center justify-center font-mono text-xs text-[#71717A]">03</span>
                  Disclaimer
                </h2>
                <p className="text-[#71717A] leading-relaxed pl-11">
                  The materials on LuminaPrep's website are provided on an 'as is' basis. LuminaPrep makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-[#09090B] mb-4 flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-[#FAFAFA] border border-[#E4E4E7] rounded-lg flex items-center justify-center font-mono text-xs text-[#71717A]">04</span>
                  Limitations
                </h2>
                <p className="text-[#71717A] leading-relaxed pl-11">
                  In no event shall LuminaPrep or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on LuminaPrep's website.
                </p>
              </section>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 border-t border-[#E4E4E7] bg-[#FAFAFA] relative z-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <img src="https://res.cloudinary.com/dfwutfkbn/image/upload/v1778865007/c53281de-f18c-45fa-ae3d-bdd4cbb95e85.png" alt="LuminaPrep Logo" className="w-6 h-6 rounded object-cover" />
              <span className="text-sm font-semibold text-[#09090B]">LuminaPrep</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#71717A]">
              <Link to="/" hash="features" className="hover:text-[#09090B] transition-colors">Features</Link>
              <Link to="/" hash="how-it-works" className="hover:text-[#09090B] transition-colors">How it Works</Link>
              <a href="https://github.com/iwansusanto/luminaprep" target="_blank" rel="noreferrer" className="hover:text-[#09090B] transition-colors">GitHub</a>
              <Link to="/login" className="bg-[#09090B] text-white px-5 py-2 rounded-lg hover:bg-[#18181B] transition-colors">
                Get Started
              </Link>
            </div>
            <p className="text-sm text-[#71717A]">
              2026 LuminaPrep Inc.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
