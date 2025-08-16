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
    const { pickup, dropoff, dropoff_address, service } = body || {}
    console.log('Match request:', {
      riderId: (await getServerSession(serverAuthOptions))?.user?.id,
      pickup,
    })
    // MVP: require rider GPS
    if (!pickup?.lat || !pickup?.lng) {
      return NextResponse.json({ error: 'pickup.lat/lng required' }, { status: 400 })
    }

    const client = await pool.connect()
    try {
      // Rectangle selection (~3km) and seen in last 30s
      const presenceWindow = await client.query(
        `SELECT COUNT(*)::int AS c FROM driver_presence WHERE NOW() - last_seen <= INTERVAL '2 minutes'`
      )
      const delta = 0.2; // ~20km latitude window; longitude approx similar for MVP
      let candidates = await client.query(
        `SELECT dp.driver_id
         FROM driver_presence dp
         WHERE NOW() - dp.last_seen <= INTERVAL '2 minutes'
           AND dp.lat BETWEEN $1 AND $2
           AND dp.lng BETWEEN $3 AND $4
           AND NOT EXISTS (
             SELECT 1 FROM rides r WHERE r.driver_id = dp.driver_id AND r.ended_at IS NULL
           )
         LIMIT 20;`,
        [pickup.lat - delta, pickup.lat + delta, pickup.lng - delta, pickup.lng + delta]
      )
      console.log('Presence last30s:', presenceWindow.rows[0]?.c, 'candidates:', candidates.rows.length)

      if (candidates.rows.length === 0) {
        // Fallback: widen once (±1°) with explicit log
        const anyNearby = await client.query(
          `SELECT dp.driver_id
           FROM driver_presence dp
           WHERE NOW() - dp.last_seen <= INTERVAL '2 minutes'
             AND dp.lat BETWEEN $1 AND $2
             AND dp.lng BETWEEN $3 AND $4
             AND NOT EXISTS (
               SELECT 1 FROM rides r WHERE r.driver_id = dp.driver_id AND r.ended_at IS NULL
             )
           ORDER BY dp.last_seen DESC
           LIMIT 20;`,
          [pickup.lat - 1, pickup.lat + 1, pickup.lng - 1, pickup.lng + 1]
        )
        console.warn('Match: small rectangle empty, widening once', {
          riderLat: pickup.lat, riderLng: pickup.lng,
          smallBounds: { minLat: pickup.lat - delta, maxLat: pickup.lat + delta, minLng: pickup.lng - delta, maxLng: pickup.lng + delta },
          wideBounds: { minLat: pickup.lat - 1, maxLat: pickup.lat + 1, minLng: pickup.lng - 1, maxLng: pickup.lng + 1 },
          presenceLast2m: presenceWindow.rows[0]?.c || 0,
          widenedCandidates: anyNearby.rows.length
        })
        candidates = anyNearby
        if (candidates.rows.length === 0) {
          // Log distances of recent drivers from rider
          const recents = await client.query(
            `SELECT user_id::text, lat, lng, last_seen
             FROM driver_presence
             WHERE NOW() - last_seen <= INTERVAL '2 minutes'
             ORDER BY last_seen DESC
             LIMIT 20;`
          )
          const toRad = (d: number) => (d * Math.PI) / 180
          const havKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
            const R = 6371
            const dLat = toRad(bLat - aLat)
            const dLng = toRad(bLng - aLng)
            const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
            const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
            return R * c
          }
          const distances = recents.rows.map((row: any) => ({
            user_id: row.user_id,
            lat: Number(row.lat),
            lng: Number(row.lng),
            last_seen: row.last_seen,
            distance_km: havKm(pickup.lat, pickup.lng, Number(row.lat), Number(row.lng))
          })).sort((a: any, b: any) => a.distance_km - b.distance_km).slice(0, 10)
          console.warn('Match: no drivers available after widen; distances from rider (km)', { rider: { lat: pickup.lat, lng: pickup.lng }, distances })
          return NextResponse.json({ ok: false, message: 'No drivers nearby', debug: { presenceLast2m: presenceWindow.rows[0]?.c || 0, distances } }, { status: 200 })
        }
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
            `INSERT INTO rides (rider_id, driver_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, dropoff_address, status, created_at, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), NOW() + INTERVAL '2 minutes')
             RETURNING id`,
            [riderId, row.driver_id, pickup.lat, pickup.lng, dropoff?.lat ?? null, dropoff?.lng ?? null, dropoff_address ?? null]
          )
          rideId = insert.rows[0].id
          break
        } catch (e: any) {
          // unique index violation -> driver already active; try next
          continue
        }
      }

      if (!rideId) {
        // Extra logging in rare race condition where all got busy
        const recents = await client.query(
          `SELECT user_id::text, lat, lng, last_seen
           FROM driver_presence
           WHERE NOW() - last_seen <= INTERVAL '2 minutes'
           ORDER BY last_seen DESC
           LIMIT 20;`
        )
        const toRad = (d: number) => (d * Math.PI) / 180
        const havKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
          const R = 6371
          const dLat = toRad(bLat - aLat)
          const dLng = toRad(bLng - aLng)
          const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
          const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
          return R * c
        }
        const distances = recents.rows.map((row: any) => ({
          user_id: row.user_id,
          lat: Number(row.lat),
          lng: Number(row.lng),
          last_seen: row.last_seen,
          distance_km: havKm(pickup.lat, pickup.lng, Number(row.lat), Number(row.lng))
        })).sort((a: any, b: any) => a.distance_km - b.distance_km).slice(0, 10)
        console.warn('Match: all nearby drivers became busy; distances from rider (km)', { rider: { lat: pickup.lat, lng: pickup.lng }, distances })
        return NextResponse.json({ ok: false, message: 'All nearby drivers became busy', debug: { distances } }, { status: 200 })
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
