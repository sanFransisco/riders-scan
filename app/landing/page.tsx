import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { serverAuthOptions } from '@/lib/auth-config'

export default async function LandingPage() {
  const session = await getServerSession(serverAuthOptions)
  
  if (session) {
    redirect('/')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to Riders Scan
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            The honest database of local drivers. Make informed decisions about your ride.
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="/auth/signin"
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium inline-block"
            >
              Get Started
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div className="text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Find Honest Reviews</h3>
            <p className="text-gray-600">Search by driver name or license plate to see real ratings and reviews from other riders.</p>
          </div>

          <div className="text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Share Your Experience</h3>
            <p className="text-gray-600">Help other riders by submitting honest reviews of drivers you've used.</p>
          </div>

          <div className="text-center">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Make Informed Decisions</h3>
            <p className="text-gray-600">Choose your driver based on real experiences from the community.</p>
          </div>
        </div>

        <div className="mt-16 p-8 bg-gray-50 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Why Riders Scan?</h2>
          <p className="text-gray-600 mb-6">
            We believe in transparency and community-driven reviews. Every review helps build a safer, 
            more informed riding experience for everyone.
          </p>
          <div className="text-sm text-gray-500">
            Join thousands of riders who trust Riders Scan for honest driver reviews.
          </div>
        </div>
      </div>
    </div>
  )
}
