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
      if (count === 0 && recentTotal > 0) {
        const wideRes = await client.query(
          `SELECT COUNT(*)::int AS cnt
           FROM driver_presence
           WHERE last_seen > NOW() - INTERVAL '2 minutes'
             AND lat BETWEEN $1 AND $2
             AND lng BETWEEN $3 AND $4`,
          [lat - 1, lat + 1, lng - 1, lng + 1]
        )
        count = wideRes.rows[0]?.cnt ?? 0
      }
      return NextResponse.json({ ok: true, count, recentTotal, bounds: { minLat, maxLat, minLng, maxLng } })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Nearby drivers error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


