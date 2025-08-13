'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ReviewSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const driverId = searchParams.get('driverId')

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-8 max-w-md mx-auto px-4">
        {/* Thank You Title */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">
            Thank you
          </h1>
          <p className="text-lg text-gray-600">
            Your review has been submitted successfully.
          </p>
        </div>

        {/* Driver Analytics Link */}
        {driverId && (
          <div className="pt-8">
            <Button 
              onClick={() => router.push(`/drivers/${driverId}`)}
              className="inline-flex items-center gap-2 px-6 py-3 text-lg"
            >
              View Driver Analytics
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Home Link */}
        <div className="pt-4">
          <Button 
            variant="ghost"
            onClick={() => router.push('/')}
            className="text-gray-500 hover:text-gray-700"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
}
