'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DriverAnalytics } from '@/lib/supabase-db'
import DriverOverlay from '@/components/DriverOverlay'
import DriverSelectionOverlay from '@/components/DriverSelectionOverlay'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDriver, setSelectedDriver] = useState<DriverAnalytics | null>(null)
  const [searchResults, setSearchResults] = useState<DriverAnalytics[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/landing')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null // Will redirect to landing page
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch(`/api/drivers?q=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const results = await response.json()
        if (results.length > 0) {
          if (results.length === 1) {
            // If only one result, show it directly
            setSelectedDriver(results[0])
          } else {
            // If multiple results, show selection overlay
            setSearchResults(results)
          }
        } else {
          // Handle no results found
          console.log('No drivers found')
        }
      } else {
        const errorData = await response.json()
        console.error('Search failed:', errorData.error)
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

  const handleSelectDriver = (driver: DriverAnalytics) => {
    setSelectedDriver(driver)
    setSearchResults([])
  }

  const handleCloseSelection = () => {
    setSearchResults([])
  }

    return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Search Section */}
        <div className="bg-white rounded-lg p-8 text-center border shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Find Driver Reviews
          </h2>
          <p className="text-gray-600 mb-6">
            Search by driver name or license plate to see ratings and reviews.
          </p>
          <div className="flex gap-2 max-w-md mx-auto">
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

        {/* Review Submission Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8 text-center border border-blue-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Share Your Experience
          </h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Help other riders by submitting an honest review of a driver you've used.
          </p>
          <Button
            onClick={() => router.push('/reviews/create')}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
          >
            <Plus className="h-5 w-5 mr-2" />
            Submit a Review
          </Button>
        </div>
      </div>

      {/* Driver Selection Overlay */}
      {searchResults.length > 0 && (
        <DriverSelectionOverlay
          drivers={searchResults}
          onSelectDriver={handleSelectDriver}
          onClose={handleCloseSelection}
        />
      )}

      {/* Driver Overlay */}
      {selectedDriver && (
        <DriverOverlay
          driver={selectedDriver}
          onClose={() => setSelectedDriver(null)}
        />
      )}
    </div>
  )
}
