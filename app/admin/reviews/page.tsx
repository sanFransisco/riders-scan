'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Trash2, Search, Star, Clock, MapPin, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Review {
  id: string
  driver_id: string
  driver_name: string
  license_plate: string
  overall_rating: number
  pleasantness_rating?: number
  ride_speed_satisfied: boolean
  was_on_time: boolean
  waiting_time_minutes?: number
  price_fair: boolean
  review_text?: string
  ride_city?: string
  created_at: string
}

export default function AdminReviewsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    if (!session || !session.user?.role || !['admin', 'moderator'].includes(session.user.role)) {
      router.push('/')
      return
    }

    fetchReviews()
  }, [session, status, router])

  const fetchReviews = async () => {
    try {
      const response = await fetch('/api/admin/reviews')
      if (!response.ok) {
        throw new Error('Failed to fetch reviews')
      }
      const data = await response.json()
      setReviews(data.reviews)
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return
    }

    setDeletingId(reviewId)
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete review')
      }

      // Remove from local state
      setReviews(reviews.filter(review => review.id !== reviewId))
    } catch (error) {
      console.error('Error deleting review:', error)
      alert('Failed to delete review')
    } finally {
      setDeletingId(null)
    }
  }

  const filteredReviews = reviews.filter(review =>
    review.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    review.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    review.ride_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    review.review_text?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating})</span>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!session || !session.user?.role || !['admin', 'moderator'].includes(session.user.role)) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center">Access denied. Admin or moderator privileges required.</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Reviews Management</h1>
        <p className="text-muted-foreground">
          Manage all driver reviews. You can view, search, and delete reviews.
        </p>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by driver name, license plate, city, or review text..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Reviews Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Reviews ({filteredReviews.length})</CardTitle>
          <CardDescription>
            Showing {filteredReviews.length} of {reviews.length} reviews
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading reviews...</div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No reviews match your search.' : 'No reviews found.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Driver</th>
                    <th className="text-left p-3 font-medium">Overall Rating</th>
                    <th className="text-left p-3 font-medium">Pleasantness</th>
                    <th className="text-left p-3 font-medium">Details</th>
                    <th className="text-left p-3 font-medium">Location</th>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviews.map((review) => (
                    <tr key={review.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{review.driver_name}</div>
                          <div className="text-sm text-gray-500">{review.license_plate}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        {renderStars(review.overall_rating)}
                      </td>
                      <td className="p-3">
                        {review.pleasantness_rating ? (
                          renderStars(review.pleasantness_rating)
                        ) : (
                          <span className="text-gray-400">Not rated</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <div className={`w-2 h-2 rounded-full ${review.ride_speed_satisfied ? 'bg-green-500' : 'bg-red-500'}`} />
                            {review.ride_speed_satisfied ? 'Speed satisfied' : 'Speed not satisfied'}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-3 w-3" />
                            {review.was_on_time ? 'On time' : `Late (${review.waiting_time_minutes}min)`}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <div className={`w-2 h-2 rounded-full ${review.price_fair ? 'bg-green-500' : 'bg-red-500'}`} />
                            {review.price_fair ? 'Fair price' : 'Unfair price'}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {review.ride_city ? (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {review.ride_city}
                          </div>
                        ) : (
                          <span className="text-gray-400">Not specified</span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {formatDate(review.created_at)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {review.review_text && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <MessageSquare className="h-3 w-3" />
                              Has comment
                            </div>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteReview(review.id)}
                            disabled={deletingId === review.id}
                          >
                            {deletingId === review.id ? (
                              'Deleting...'
                            ) : (
                              <>
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
