import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { serverAuthOptions } from '@/lib/auth-config'
import { pool } from '@/lib/supabase-db'

// GET /api/driver/nearby?lat=..&lng=..
// Counts drivers with recent presence inside a simple lat/lng rectangle.
export async function GET(req: NextRequest) {
  try {
    // Public read allowed by RLS policy; no auth required

    const { searchParams } = new URL(req.url)
    const latStr = searchParams.get('lat')
    const lngStr = searchParams.get('lng')
    const widthStr = searchParams.get('width') // optional half-width in degrees
    const heightStr = searchParams.get('height') // optional half-height in degrees

    const lat = latStr != null ? Number(latStr) : NaN
    const lng = lngStr != null ? Number(lngStr) : NaN
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json({ error: 'Missing or invalid lat/lng' }, { status: 400 })
    }

    const halfWidth = widthStr != null ? Math.max(0.01, Math.min(1, Number(widthStr))) : 0.2
    const halfHeight = heightStr != null ? Math.max(0.01, Math.min(1, Number(heightStr))) : 0.2

    const minLat = lat - halfHeight
    const maxLat = lat + halfHeight
    const minLng = lng - halfWidth
    const maxLng = lng + halfWidth

    const client = await pool.connect()
    try {
      // Ensure a permissive read policy exists in environments where init didn't run
      try {
        await client.query(`DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'driver_presence' AND policyname = 'Anyone can read driver_presence'
          ) THEN
            EXECUTE 'CREATE POLICY "Anyone can read driver_presence" ON public.driver_presence FOR SELECT USING (true)';
          END IF;
        END $$;`)
      } catch {}

      const recentRes = await client.query(
        `SELECT COUNT(*)::int AS cnt FROM driver_presence WHERE last_seen > NOW() - INTERVAL '2 minutes'`
      )
      const rectRes = await client.query(
        `SELECT COUNT(*)::int AS cnt
         FROM driver_presence
         WHERE last_seen > NOW() - INTERVAL '2 minutes'
           AND lat BETWEEN $1 AND $2
           AND lng BETWEEN $3 AND $4`,
        [minLat, maxLat, minLng, maxLng]
      )
      const recentTotal = recentRes.rows[0]?.cnt ?? 0
      let count = rectRes.rows[0]?.cnt ?? 0
      // Fallback: if 0 in small rect but there are recent drivers, widen once to be permissive for demos
      const wideRes = await client.query(
        `SELECT COUNT(*)::int AS cnt
         FROM driver_presence
         WHERE last_seen > NOW() - INTERVAL '2 minutes'
           AND lat BETWEEN $1 AND $2
           AND lng BETWEEN $3 AND $4`,
        [lat - 1, lat + 1, lng - 1, lng + 1]
      )
      const wideCount = wideRes.rows[0]?.cnt ?? 0
      // Do NOT inflate displayCount beyond the small rectangle.
      // Only log when zero to aid debugging.
      if (count === 0) {
        console.warn('Nearby: 0 drivers in small rectangle (~20km box)', {
          lat, lng,
          smallBounds: { minLat, maxLat, minLng, maxLng },
          halfWidth, halfHeight,
          recentTotal, wideCount
        })
      }
      const samples = await client.query(
        `SELECT user_id::text, lat, lng, last_seen
         FROM driver_presence
         WHERE last_seen > NOW() - INTERVAL '2 minutes'
         ORDER BY last_seen DESC
         LIMIT 5`
      )

      // Compute nearest distance (km) from samples to rider
      const toRad = (d: number) => (d * Math.PI) / 180
      const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const R = 6371
        const dLat = toRad(lat2 - lat1)
        const dLng = toRad(lng2 - lng1)
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
      }
      let nearestDistanceKm: number | null = null
      let nearestCoord: { lat: number; lng: number } | null = null
      for (const row of samples.rows) {
        const d = haversineKm(lat, lng, Number(row.lat), Number(row.lng))
        if (nearestDistanceKm == null || d < nearestDistanceKm) {
          nearestDistanceKm = d
          nearestCoord = { lat: Number(row.lat), lng: Number(row.lng) }
        }
      }

      console.log('Nearby request', { lat, lng, halfWidth, halfHeight, bounds: { minLat, maxLat, minLng, maxLng }, recentTotal, count, wideCount, nearestDistanceKm, nearestCoord, samples: samples.rows })
      return NextResponse.json({ ok: true, count, recentTotal, wideCount, nearestDistanceKm, bounds: { minLat, maxLat, minLng, maxLng } })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Nearby drivers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


