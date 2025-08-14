'use client'

import { X, Star, Clock, DollarSign, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DriverAnalytics } from '@/lib/supabase-db'

interface DriverSelectionOverlayProps {
  drivers: DriverAnalytics[]
  onSelectDriver: (driver: DriverAnalytics) => void
  onClose: () => void
}

// Utility function to get color based on percentage
function getPercentageColor(percentage: number): string {
  if (percentage < 40) return 'text-red-600'
  if (percentage < 50) return 'text-yellow-600'
  return 'text-green-600'
}

export default function DriverSelectionOverlay({ drivers, onSelectDriver, onClose }: DriverSelectionOverlayProps) {
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

        {/* Driver Selection Content */}
        <div className="container mx-auto px-4 pt-16 pb-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-bold tracking-tight">
                Multiple Drivers Found
              </h1>
              <p className="text-lg text-muted-foreground">
                Please select the driver you're looking for:
              </p>
            </div>

            {/* Driver Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {drivers.map((driver) => (
                <Card 
                  key={driver.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-gray-300"
                  onClick={() => onSelectDriver(driver)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-xl">{driver.full_name || 'Unknown Driver'}</span>
                      {driver.avg_overall && (
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{driver.avg_overall}</span>
                        </div>
                      )}
                    </CardTitle>
                    <CardDescription className="font-mono text-lg">
                      {driver.license_plate}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Reviews:</span>
                      <span className="font-medium">{driver.total_reviews}</span>
                    </div>
                    
                    {driver.on_time_percentage && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-green-600" />
                        <span>On time <span className={getPercentageColor(driver.on_time_percentage)}>{driver.on_time_percentage}%</span></span>
                      </div>
                    )}
                    
                    {driver.price_fair_percentage && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span>Fair price <span className={getPercentageColor(driver.price_fair_percentage)}>{driver.price_fair_percentage}%</span></span>
                      </div>
                    )}
                    
                    {driver.service_cities && driver.service_cities.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-gray-600" />
                        <span className="truncate">{driver.service_cities.slice(0, 2).join(', ')}</span>
                      </div>
                    )}
                    
                    {/* Service Ratings */}
                    {driver.service_ratings && Object.keys(driver.service_ratings).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(driver.service_ratings).slice(0, 2).map(([service, data]) => (
                          <div
                            key={service}
                            className="flex items-center gap-1 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs"
                          >
                            <span className="font-medium text-gray-700">{service}</span>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="font-bold">{data.rating}</span>
                            </div>
                          </div>
                        ))}
                        {Object.keys(driver.service_ratings).length > 2 && (
                          <span className="text-xs text-gray-500">+{Object.keys(driver.service_ratings).length - 2} more</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Instructions */}
            <div className="text-center text-sm text-muted-foreground">
              Click on a driver card to view detailed analytics
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
