'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { signIn } from 'next-auth/react'

export default function LandingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-black">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'authenticated') {
    return null // Will redirect to home page
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6">
      <div className="text-center max-w-2xl px-4">
        {/* Main Headline */}
        <div className="mb-8">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black leading-tight">
            Find honest driver reviews.
            <br />
            Make informed decisions.
          </h2>
        </div>

        {/* Descriptive Text */}
        <div className="mb-12">
          <p className="text-base sm:text-lg text-black leading-relaxed">
            Now with community-driven insights, the most reliable, comprehensive, and honest driver database yet, with real experiences built in. Available for every rider.
          </p>
        </div>

        {/* Call to Action */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => signIn('google')}
            className="px-8 py-3 bg-white text-black border border-gray-300 rounded-full hover:bg-gray-50 transition-colors font-medium inline-flex items-center"
          >
            Start now
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <a
            href="#"
            className="text-black hover:text-gray-700 transition-colors font-medium"
          >
            Learn about our community &gt;
          </a>
        </div>
      </div>
    </div>
  )
}
