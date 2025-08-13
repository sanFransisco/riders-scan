import { NextRequest, NextResponse } from 'next/server'
import { searchDrivers } from '@/lib/db'

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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
