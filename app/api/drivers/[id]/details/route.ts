import { NextRequest, NextResponse } from 'next/server'
import { getDriverById } from '@/lib/supabase-db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const driverId = params.id

    const driver = await getDriverById(driverId)

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }

    return NextResponse.json(driver)
  } catch (error) {
    console.error('Error getting driver details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
