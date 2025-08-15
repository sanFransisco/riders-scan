import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { serverAuthOptions } from '@/lib/auth-config'
import { pool } from '@/lib/supabase-db'

export async function GET() {
  try {
    const session = await getServerSession(serverAuthOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const client = await pool.connect()
    try {
      const res = await client.query(
        `SELECT id, rider_id, driver_id, status, created_at, started_at, ended_at,
                driver_accepted_at, rider_consented_at, expires_at,
                pickup_lng, pickup_lat, dropoff_lng, dropoff_lat
         FROM rides
         WHERE rider_id = $1 AND ended_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1`,
        [session.user.id]
      )
      const ride = res.rows[0] || null
      return NextResponse.json({ ok: true, ride })
    } finally {
      client.release()
    }
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


