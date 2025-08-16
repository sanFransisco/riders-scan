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
        `SELECT r.id,
                r.status,
                r.created_at,
                r.started_at,
                r.ended_at,
                r.pickup_lat,
                r.pickup_lng,
                r.dropoff_lat,
                r.dropoff_lng,
                u.name   AS rider_name,
                u.email  AS rider_email
         FROM rides r
         LEFT JOIN users u ON u.id = r.rider_id
         WHERE r.driver_id = $1
         ORDER BY r.created_at DESC
         LIMIT 100`,
        [session.user.id]
      )
      return NextResponse.json({ ok: true, rides: res.rows })
    } finally {
      client.release()
    }
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


