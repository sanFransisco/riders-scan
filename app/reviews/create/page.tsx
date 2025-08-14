'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Star, ArrowLeft, Check, X, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface RatingInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  required?: boolean
}

function RatingInput({ label, value, onChange, required = false }: RatingInputProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={`p-1 rounded transition-colors ${
              value >= rating ? 'text-yellow-400' : 'text-gray-300'
            } hover:text-yellow-400`}
          >
            <Star className="h-6 w-6 fill-current" />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {value > 0 ? `${value}/5` : 'Select rating'}
        </span>
      </div>
    </div>
  )
}

export default function CreateReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const driverId = searchParams.get('driverId')

  const [formData, setFormData] = useState({
    driverName: '',
    licensePlate: '',
    overallRating: 0,
    pleasantnessRating: 0,
    rideSpeedSatisfied: true,
    wasOnTime: true,
    waitingTimeMinutes: '',
    priceFair: true,
    comment: '',
    rideCity: '',
    service: '',
    rideDate: new Date().toISOString().split('T')[0]
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.overallRating) {
      setError('Overall rating is required')
      return
    }

    if (!formData.wasOnTime && !formData.waitingTimeMinutes) {
      setError('Please specify waiting time when driver was late')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create review')
      }

      // Show success message briefly before redirecting
      setSuccess(true)
      setTimeout(() => {
        const successParams = new URLSearchParams()
        if (driverId) successParams.set('driverId', driverId)
        if (formData.driverName) successParams.set('driverName', formData.driverName)
        router.push(`/reviews/success?${successParams.toString()}`)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create review')
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Review</h1>
          <p className="text-muted-foreground">
            Share your experience with this driver
          </p>
        </div>
      </div>

      {/* Review Form */}
      <Card>
        <CardHeader>
          <CardTitle>Review Details</CardTitle>
          <CardDescription>
            Rate your experience with this driver
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Driver Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="driverName" className="text-sm font-medium">
                  Driver Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="driverName"
                  value={formData.driverName}
                  onChange={(e) => updateFormData('driverName', e.target.value)}
                  placeholder="Enter driver's full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licensePlate" className="text-sm font-medium">
                  License Plate <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="licensePlate"
                  value={formData.licensePlate}
                  onChange={(e) => updateFormData('licensePlate', e.target.value)}
                  placeholder="Enter license plate number"
                  required
                />
              </div>
            </div>

            {/* Ratings */}
            <div className="space-y-4">
              <RatingInput
                label="Overall Rating"
                value={formData.overallRating}
                onChange={(value) => updateFormData('overallRating', value)}
                required
              />
              <RatingInput
                label="Ride Pleasantness"
                value={formData.pleasantnessRating}
                onChange={(value) => updateFormData('pleasantnessRating', value)}
              />
            </div>

            {/* Punctuality */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="wasOnTime"
                  checked={formData.wasOnTime}
                  onCheckedChange={(checked) => updateFormData('wasOnTime', checked)}
                />
                <Label htmlFor="wasOnTime" className="text-sm font-medium">
                  Driver arrived on time
                </Label>
              </div>

              {!formData.wasOnTime && (
                <div className="space-y-2">
                  <Label htmlFor="waitingTime" className="text-sm font-medium">
                    How many minutes late? <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="waitingTime"
                    type="number"
                    min="1"
                    value={formData.waitingTimeMinutes}
                    onChange={(e) => updateFormData('waitingTimeMinutes', e.target.value)}
                    placeholder="Enter waiting time in minutes"
                    required={!formData.wasOnTime}
                  />
                </div>
              )}
            </div>

            {/* Ride Speed */}
            <div className="flex items-center space-x-2">
              <Switch
                id="rideSpeedSatisfied"
                checked={formData.rideSpeedSatisfied}
                onCheckedChange={(checked) => updateFormData('rideSpeedSatisfied', checked)}
              />
              <Label htmlFor="rideSpeedSatisfied" className="text-sm font-medium">
                Satisfied with ride speed
              </Label>
            </div>

            {/* Price Fairness */}
            <div className="flex items-center space-x-2">
              <Switch
                id="priceFair"
                checked={formData.priceFair}
                onCheckedChange={(checked) => updateFormData('priceFair', checked)}
              />
              <Label htmlFor="priceFair" className="text-sm font-medium">
                Price was fair for the service
              </Label>
            </div>

            {/* Service Selection */}
            <div className="space-y-2">
              <Label htmlFor="service" className="text-sm font-medium">
                Service Used
              </Label>
              <select
                id="service"
                value={formData.service}
                onChange={(e) => updateFormData('service', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select a service</option>
                <option value="Yango">Yango</option>
                <option value="Gett">Gett</option>
                <option value="Uber">Uber</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Additional Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rideCity" className="text-sm font-medium">
                  City/Area of Ride
                </Label>
                <Input
                  id="rideCity"
                  value={formData.rideCity}
                  onChange={(e) => updateFormData('rideCity', e.target.value)}
                  placeholder="e.g., Downtown, Airport"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rideDate" className="text-sm font-medium">
                  Date of Ride
                </Label>
                <Input
                  id="rideDate"
                  type="date"
                  value={formData.rideDate}
                  onChange={(e) => updateFormData('rideDate', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <Label htmlFor="comment" className="text-sm font-medium">
                Additional Comments
              </Label>
              <textarea
                id="comment"
                value={formData.comment}
                onChange={(e) => updateFormData('comment', e.target.value)}
                placeholder="Share any additional details about your experience..."
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <X className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600">{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">
                  Review submitted successfully! Redirecting to thank you page...
                </span>
              </div>
            )}

            {/* Submit Button */}
            <Button type="submit" disabled={loading || success} className="w-full">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Review...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Review Submitted!
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Submit Review
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
