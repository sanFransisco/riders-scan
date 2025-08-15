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
        `SELECT r.id, r.rider_id, r.driver_id, r.status, r.created_at, r.started_at, r.ended_at,
                r.driver_accepted_at, r.rider_consented_at, r.expires_at,
                r.pickup_lng, r.pickup_lat, r.dropoff_lng, r.dropoff_lat,
                d.license_plate, d.full_name
         FROM rides r
         LEFT JOIN drivers d ON d.user_id = r.driver_id
         WHERE r.id = $1`,
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
