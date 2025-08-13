'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Star, ArrowLeft, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ReviewSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const driverName = searchParams.get('driverName')
  const driverId = searchParams.get('driverId')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Success Message */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-800">
            Thank You for Your Review!
          </CardTitle>
          <CardDescription className="text-green-700">
            Your honest feedback helps other riders make informed decisions.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {driverName && (
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <p className="text-sm text-gray-600 mb-2">Review submitted for:</p>
              <p className="text-lg font-semibold text-gray-800">{driverName}</p>
            </div>
          )}
          
          <div className="flex items-center justify-center gap-2 text-yellow-600">
            <Star className="h-5 w-5 fill-current" />
            <span className="text-sm font-medium">Your review will be visible to other riders</span>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>What's Next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <p className="font-medium">View Driver Profile</p>
              <p className="text-sm text-muted-foreground">
                See how your review affects the driver's overall rating and statistics.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <p className="font-medium">Search More Drivers</p>
              <p className="text-sm text-muted-foreground">
                Help build our community by reviewing other drivers you've used.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <p className="font-medium">Share with Friends</p>
              <p className="text-sm text-muted-foreground">
                Let other riders know about this platform for honest driver reviews.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        {driverId && (
          <Button 
            onClick={() => router.push(`/drivers/${driverId}`)}
            className="flex-1 max-w-xs"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            View Driver Profile
          </Button>
        )}
        
        <Button 
          variant="outline"
          onClick={() => router.push('/')}
          className="flex-1 max-w-xs"
        >
          <Home className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>

      {/* Community Message */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-blue-800">Building a Better Ride Experience</h3>
            <p className="text-sm text-blue-700">
              Every review helps create transparency in the ride-sharing community. 
              Thank you for contributing to honest, reliable driver information.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
