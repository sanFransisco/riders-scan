'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Star, Clock, DollarSign, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DriverAnalytics } from '@/lib/db'

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<DriverAnalytics[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const router = useRouter()

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch(`/api/drivers?q=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const results = await response.json()
        setSearchResults(results)
      } else {
        const errorData = await response.json()
        console.error('Search failed:', errorData.error)
        // You could show this error to the user
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Find Honest Driver Reviews
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Search by driver name or license plate to see real ratings, punctuality, and price fairness from other riders.
        </p>
      </div>

      {/* Search Section */}
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Search by driver name or license plate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isSearching}>
            <Search className="h-4 w-4 mr-2" />
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Search Results</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {searchResults.map((driver) => (
              <Card key={driver.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/drivers/${driver.id}`)}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>{driver.full_name}</span>
                    {driver.avg_overall && (
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{driver.avg_overall}</span>
                      </div>
                    )}
                  </CardTitle>
                  <CardDescription className="font-mono text-sm">
                    {driver.license_plate}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Reviews:</span>
                    <span className="font-medium">{driver.total_reviews}</span>
                  </div>
                  {driver.on_time_percentage && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-green-600" />
                      <span>On time {driver.on_time_percentage}%</span>
                    </div>
                  )}
                  {driver.price_fair_percentage && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span>Fair price {driver.price_fair_percentage}%</span>
                    </div>
                  )}
                  {driver.service_cities && driver.service_cities.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span>{driver.service_cities.slice(0, 2).join(', ')}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Features Section */}
      <div className="grid gap-6 md:grid-cols-3 mt-16">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Find Drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Search by name or license plate to find driver profiles with detailed ratings and reviews.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Honest Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Read real experiences from other riders about punctuality, service quality, and pricing.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Make Informed Decisions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Compare drivers based on ratings, on-time percentage, and price fairness before booking.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
