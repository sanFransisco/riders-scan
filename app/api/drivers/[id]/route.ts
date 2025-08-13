import { NextRequest, NextResponse } from 'next/server'
import { getDriverAnalytics, getDriverReviews } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const driverId = params.id

    const [analytics, reviews] = await Promise.all([
      getDriverAnalytics(driverId),
      getDriverReviews(driverId)
    ])

    if (!analytics) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }

    return NextResponse.json({
      analytics,
      reviews
    })
  } catch (error) {
    console.error('Error getting driver:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
