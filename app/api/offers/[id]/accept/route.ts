import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { serverAuthOptions } from '@/lib/auth-config'
import { pool } from '@/lib/supabase-db'

export async function POST(
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
      const rideRes = await client.query('SELECT id, driver_id, expires_at, status FROM rides WHERE id = $1', [params.id])
      if (rideRes.rows.length === 0) {
        return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
      }
      const ride = rideRes.rows[0]
      if (ride.driver_id !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (ride.expires_at && new Date(ride.expires_at) < new Date()) {
        return NextResponse.json({ error: 'Offer expired' }, { status: 410 })
      }

      await client.query(
        `UPDATE rides SET driver_accepted_at = NOW(), status = 'consented' WHERE id = $1`,
        [params.id]
      )
      return NextResponse.json({ ok: true })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Offer accept error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
