'use client'

import { X, Star, Clock, DollarSign, MapPin } from 'lucide-react'
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
              <h1 className="text-4xl font-bold tracking-tight">
                {driver.full_name}
              </h1>
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
                  <CardTitle className={`text-3xl font-bold ${getPercentageColor(driver.on_time_percentage)}`}>
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
                      <span className={`text-2xl font-bold ${getPercentageColor(driver.ride_speed_satisfied_percentage)}`}>
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
                      Average Wait Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{driver.avg_waiting_time}</span>
                      <span className="text-muted-foreground">minutes</span>
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
                    <MapPin className="h-5 w-5 text-blue-600" />
                    Service Areas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {driver.service_cities.map((city, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {city}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}


          </div>
        </div>
      </div>
    </div>
  )
}
