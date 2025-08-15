import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { serverAuthOptions } from '@/lib/auth-config'
import { pool } from '@/lib/supabase-db'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(serverAuthOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { pickup, dropoff, service } = body || {}
    if (!pickup?.lat || !pickup?.lng) {
      return NextResponse.json({ error: 'pickup.lat/lng required' }, { status: 400 })
    }

    const client = await pool.connect()
    try {
      // find candidate drivers inside a 3km radius and seen in last 30s and not active in rides
      const candidates = await client.query(
        `WITH rect AS (
           SELECT ST_MakeEnvelope($1,$2,$3,$4, 4326)::geography AS env
         )
         SELECT dp.driver_id
         FROM driver_presence dp, rect
         WHERE NOW() - dp.last_seen <= INTERVAL '30 seconds'
           AND ST_DWithin(dp.geom, ST_SetSRID(ST_MakePoint($5,$6),4326)::geography, 3000)
           AND NOT EXISTS (
             SELECT 1 FROM rides r WHERE r.driver_id = dp.driver_id AND r.ended_at IS NULL
           )
         LIMIT 20;`,
        [pickup.lng-0.02, pickup.lat-0.02, pickup.lng+0.02, pickup.lat+0.02, pickup.lng, pickup.lat]
      )

      if (candidates.rows.length === 0) {
        return NextResponse.json({ ok: false, message: 'No drivers nearby' }, { status: 200 })
      }

      const riderId = session.user.id
      // Prevent self-matching if user is also online as driver
      const blockedDriver = await client.query(`
        SELECT 1 FROM driver_presence WHERE user_id = $1 AND NOW() - last_seen <= INTERVAL '30 seconds'`,
        [riderId]
      )
      const excludeSelf = blockedDriver.rows.length > 0 ? riderId : null
      let rideId: string | null = null
      for (const row of candidates.rows) {
        if (excludeSelf && row.driver_id === excludeSelf) continue
        try {
          const insert = await client.query(
            `INSERT INTO rides (rider_id, driver_id, pickup, status, created_at, expires_at)
             VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3,$4),4326)::geography, 'pending', NOW(), NOW() + INTERVAL '2 minutes')
             RETURNING id`,
            [riderId, row.driver_id, pickup.lng, pickup.lat]
          )
          rideId = insert.rows[0].id
          break
        } catch (e: any) {
          // unique index violation -> driver already active; try next
          continue
        }
      }

      if (!rideId) {
        return NextResponse.json({ ok: false, message: 'All nearby drivers became busy' }, { status: 200 })
      }

      return NextResponse.json({ ok: true, matchId: rideId })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Match request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
