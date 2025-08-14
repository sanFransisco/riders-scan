import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { serverAuthOptions } from '@/lib/auth-config'

export default async function LandingPage() {
  const session = await getServerSession(serverAuthOptions)
  
  if (session) {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        {/* Main Headline */}
        <div className="mb-8">
          <h2 className="text-5xl font-bold text-black leading-tight">
            Find honest driver reviews.
            <br />
            Make informed decisions.
          </h2>
        </div>

        {/* Descriptive Text */}
        <div className="mb-12">
          <p className="text-lg text-black leading-relaxed">
            Now with community-driven insights, the most reliable, comprehensive, and honest driver database yet, with real experiences built in. Available for every rider.
          </p>
        </div>

        {/* Call to Action */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a
            href="/auth/signin"
            className="px-8 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors font-medium inline-flex items-center"
          >
            Start now
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
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
