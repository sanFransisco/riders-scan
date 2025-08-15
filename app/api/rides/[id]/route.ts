import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { serverAuthOptions } from '@/lib/auth-config'
import { pool } from '@/lib/supabase-db'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(serverAuthOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await pool.connect()
    try {
      const res = await client.query(
        `SELECT id, rider_id, driver_id, status, created_at, started_at, ended_at,
                driver_accepted_at, rider_consented_at, expires_at,
                ST_X(pickup::geometry) AS pickup_lng,
                ST_Y(pickup::geometry) AS pickup_lat,
                ST_X(dropoff::geometry) AS dropoff_lng,
                ST_Y(dropoff::geometry) AS dropoff_lat
         FROM rides WHERE id = $1`,
        [params.id]
      )
      if (res.rows.length === 0) {
        return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
      }
      return NextResponse.json({ ok: true, ride: res.rows[0] })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Ride fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
