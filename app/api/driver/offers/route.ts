import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { serverAuthOptions } from '@/lib/auth-config'
import { pool } from '@/lib/supabase-db'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(serverAuthOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await pool.connect()
    try {
      const res = await client.query(
        `SELECT id, rider_id, driver_id, status, created_at, expires_at,
                driver_accepted_at, rider_consented_at,
                ST_X(pickup::geometry) AS pickup_lng,
                ST_Y(pickup::geometry) AS pickup_lat
         FROM rides
         WHERE driver_id = $1
           AND status IN ('pending','consented','enroute')
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY created_at DESC
         LIMIT 10`,
        [session.user.id]
      )
      return NextResponse.json({ ok: true, offers: res.rows })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Driver offers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
