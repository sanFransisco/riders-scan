'use client'

import { useState } from 'react'
import { X, Star, Clock, DollarSign, MapPin, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DriverAnalytics } from '@/lib/supabase-db'

// Utility function to get color based on percentage
function getPercentageColor(percentage: number): string {
  if (percentage < 40) return 'text-red-600'
  if (percentage < 50) return 'text-yellow-600'
  return 'text-green-600'
}

interface DriverOverlayProps {
  driver: DriverAnalytics
  onClose: () => void
}

export default function DriverOverlay({ driver, onClose }: DriverOverlayProps) {
  const [showReviews, setShowReviews] = useState(false)
  const [reviews, setReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)

  const fetchReviews = async () => {
    setReviewsLoading(true)
    try {
      const response = await fetch(`/api/drivers/${driver.id}/reviews`)
      if (response.ok) {
        const data = await response.json()
        setReviews(data.reviews || [])
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setReviewsLoading(false)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const handleShowReviews = () => {
    setShowReviews(true)
    if (reviews.length === 0) {
      fetchReviews()
    }
  }

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      <div className="min-h-screen relative">
        {/* Close button - positioned absolutely */}
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
            className="h-10 w-10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Driver Content - starts from top */}
        <div className="container mx-auto px-4 pt-16 pb-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Driver Header */}
            <div className="text-center space-y-4">
              {driver.full_name && (
                <h1 className="text-4xl font-bold tracking-tight">
                  {driver.full_name}
                </h1>
              )}
              <p className="text-xl text-muted-foreground font-mono">
                {driver.license_plate}
              </p>
              {driver.avg_overall && (
                <div className="flex items-center justify-center gap-2">
                  <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                  <span className="text-2xl font-bold">{driver.avg_overall}</span>
                  <span className="text-muted-foreground">/ 5</span>
                </div>
              )}
              
              {/* Service Ratings */}
              {driver.service_ratings && Object.keys(driver.service_ratings).length > 0 && (
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {Object.entries(driver.service_ratings).map(([service, data]) => (
                    <div
                      key={service}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <span className="text-sm font-medium text-gray-700">{service}</span>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-bold">{data.rating}</span>
                        <span className="text-xs text-gray-500">({data.count})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Driver Stats */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="text-3xl font-bold">
                    {driver.total_reviews}
                  </CardTitle>
                  <CardDescription>Total Reviews</CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="text-3xl font-bold">
                    {driver.on_time_percentage}%
                  </CardTitle>
                  <CardDescription className="flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4" />
                    On Time
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="text-center">
                  <CardTitle className={`text-3xl font-bold ${getPercentageColor(driver.price_fair_percentage)}`}>
                    {driver.price_fair_percentage}%
                  </CardTitle>
                  <CardDescription className="flex items-center justify-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Fair Price
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            {/* Additional Stats */}
            <div className="grid gap-6 md:grid-cols-2">
              {driver.avg_pleasantness && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      Ride Pleasantness
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{driver.avg_pleasantness}</span>
                      <span className="text-muted-foreground">/ 5</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {driver.ride_speed_satisfied_percentage && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-green-500" />
                      Ride Speed Satisfaction
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {driver.ride_speed_satisfied_percentage}%
                      </span>
                      <span className="text-muted-foreground">satisfied</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {driver.avg_waiting_time && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-orange-500" />
                      Wait Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total:</span>
                        <span className="text-lg font-bold">{driver.total_waiting_time || 0}</span>
                        <span className="text-sm text-muted-foreground">minutes</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Average:</span>
                        <span className="text-lg font-bold">{driver.avg_waiting_time}</span>
                        <span className="text-sm text-muted-foreground">minutes</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Service Areas */}
            {driver.service_cities && driver.service_cities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-gray-600" />
                    Service Areas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {driver.service_cities.map((city, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                      >
                        {city}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-gray-600" />
                    Reviews
                  </span>
                  {!showReviews && (
                    <Button
                      onClick={handleShowReviews}
                      className="bg-white text-black border border-gray-300 hover:bg-gray-50 rounded-full px-4 py-2 font-medium"
                    >
                      Show Reviews
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {showReviews ? (
                  <div className="space-y-4">
                    {reviewsLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                        <p className="text-sm text-gray-600 mt-2">Loading reviews...</p>
                      </div>
                    ) : reviews.length > 0 ? (
                      <div className="space-y-4">
                        {reviews.map((review) => (
                          <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {renderStars(review.overall_rating)}
                                <span className="text-sm text-gray-600">
                                  {formatDate(review.created_at)}
                                </span>
                              </div>
                              {review.service && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                                  {review.service}
                                </span>
                              )}
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-4">
                                <span className={`flex items-center gap-1 ${review.ride_speed_satisfied ? 'text-green-600' : 'text-red-600'}`}>
                                  <div className={`w-2 h-2 rounded-full ${review.ride_speed_satisfied ? 'bg-green-500' : 'bg-red-500'}`} />
                                  {review.ride_speed_satisfied ? 'Speed satisfied' : 'Speed not satisfied'}
                                </span>
                                <span className={`flex items-center gap-1 ${review.was_on_time ? 'text-green-600' : 'text-red-600'}`}>
                                  <Clock className="h-3 w-3" />
                                  {review.was_on_time ? 'On time' : `Late (${review.waiting_time_minutes}min)`}
                                </span>
                                <span className={`flex items-center gap-1 ${review.price_fair ? 'text-green-600' : 'text-red-600'}`}>
                                  <div className={`w-2 h-2 rounded-full ${review.price_fair ? 'bg-green-500' : 'bg-red-500'}`} />
                                  {review.price_fair ? 'Fair price' : 'Unfair price'}
                                </span>
                              </div>
                              
                              {review.review_text && review.review_approved && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                  <p className="text-gray-700">{review.review_text}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-4">No reviews found</p>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    Click "Show Reviews" to view detailed reviews for this driver
                  </p>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  )
}
