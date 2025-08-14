'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Star, Clock, DollarSign, MapPin, Plus, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DriverAnalytics, Review } from '@/lib/supabase-db'
import { formatDate, formatRating, getRatingColor, getPercentageColor } from '@/lib/utils'

export default function DriverProfilePage() {
  const params = useParams()
  const router = useRouter()
  const [driverData, setDriverData] = useState<{ analytics: DriverAnalytics; reviews: Review[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        const response = await fetch(`/api/drivers/${params.id}`)
        if (!response.ok) {
          throw new Error('Driver not found')
        }
        const data = await response.json()
        setDriverData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load driver data')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchDriverData()
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading driver profile...</p>
        </div>
      </div>
    )
  }

  if (error || !driverData) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-semibold text-destructive">Error</h2>
        <p className="text-muted-foreground">{error || 'Driver not found'}</p>
        <Button onClick={() => router.push('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Search
        </Button>
      </div>
    )
  }

  const { analytics, reviews } = driverData

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Button variant="outline" onClick={() => router.push('/')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Search
      </Button>

      {/* Driver Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{analytics.full_name}</h1>
            <p className="text-lg text-muted-foreground font-mono">{analytics.license_plate}</p>
          </div>
          <Button onClick={() => router.push(`/reviews/create?driverId=${analytics.id}`)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Review
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="text-2xl font-bold">{formatRating(analytics.avg_overall || 0)}</span>
              </div>
              <p className="text-sm text-muted-foreground">Overall Rating</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Clock className="h-5 w-5 text-green-600" />
                                    <span className="text-2xl font-bold">
                      {analytics.on_time_percentage || 0}%
                    </span>
              </div>
              <p className="text-sm text-muted-foreground">On Time</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className={`text-2xl font-bold ${getPercentageColor(analytics.price_fair_percentage || 0)}`}>
                  {analytics.price_fair_percentage || 0}%
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Fair Price</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold mb-2">{analytics.total_reviews}</div>
              <p className="text-sm text-muted-foreground">Total Reviews</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rating Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Pleasantness</span>
              <div className="flex items-center gap-2">
                <span className={`font-medium ${getRatingColor(analytics.avg_pleasantness || 0)}`}>
                  {formatRating(analytics.avg_pleasantness || 0)}
                </span>
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Ride Speed Satisfaction</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {analytics.ride_speed_satisfied_percentage || 0}%
                </span>
                <span className="text-sm text-muted-foreground">satisfied</span>
              </div>
            </div>
            {analytics.avg_waiting_time && (
              <div className="flex items-center justify-between">
                <span>Avg Wait Time (when late)</span>
                <span className="font-medium text-orange-600">
                  {analytics.avg_waiting_time} min
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Areas</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.service_cities && analytics.service_cities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {analytics.service_cities.map((city, index) => (
                  <div key={index} className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                    <MapPin className="h-3 w-3" />
                    {city}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No service areas recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reviews */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Recent Reviews</h2>
        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{review.overall_rating}/5</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Pleasantness:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{review.pleasantness_rating}/5</span>
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Speed Satisfied:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{review.ride_speed_satisfied ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">On Time:</span>
                      <span className={`font-medium ${review.was_on_time ? 'text-green-600' : 'text-red-600'}`}>
                        {review.was_on_time ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                  
                  {!review.was_on_time && review.waiting_time_minutes && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Wait time:</span>
                      <span className="font-medium ml-2">{review.waiting_time_minutes} minutes</span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Price Fair:</span>
                      <span className={`font-medium ml-2 ${review.price_fair ? 'text-green-600' : 'text-red-600'}`}>
                        {review.price_fair ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {review.ride_city && (
                      <div>
                        <span className="text-muted-foreground">City:</span>
                        <span className="font-medium ml-2">{review.ride_city}</span>
                      </div>
                    )}
                  </div>

                  {review.review_text && (
                    <div className="pt-2 border-t">
                      <p className="text-sm">{review.review_text}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No reviews yet. Be the first to review this driver!</p>
              <Button className="mt-4" onClick={() => router.push(`/reviews/create?driverId=${analytics.id}`)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Review
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
