import { NextRequest, NextResponse } from 'next/server'
import { searchDrivers } from '@/lib/supabase-db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
    }

    const drivers = await searchDrivers(query)
    return NextResponse.json(drivers)
  } catch (error) {
    console.error('Error searching drivers:', error)
    
    // Check if it's a database configuration error
    if (error instanceof Error && error.message.includes('Database not configured')) {
      return NextResponse.json({ 
        error: 'Database not configured. Please set up your database environment variables.',
        details: error.message 
      }, { status: 503 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
