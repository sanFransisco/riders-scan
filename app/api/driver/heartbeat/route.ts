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
    const { lat, lng, service, accuracy_m, speed_kmh, heading_deg, device_os, app_version, battery_pct } = body || {}

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'lat and lng are required numbers' }, { status: 400 })
    }

    const client = await pool.connect()
    try {
      // For MVP we use users.id as driver_id; later we can introduce driver_profiles
      const driverId = session.user.id
      const userId = session.user.id

      await client.query(
        `INSERT INTO driver_presence (
           driver_id, user_id, lat, lng, service, accuracy_m, speed_kmh, heading_deg,
           device_os, app_version, battery_pct, last_seen
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
         ON CONFLICT (driver_id) DO UPDATE SET
           lat = EXCLUDED.lat,
           lng = EXCLUDED.lng,
           service = COALESCE(EXCLUDED.service, driver_presence.service),
           accuracy_m = EXCLUDED.accuracy_m,
           speed_kmh = EXCLUDED.speed_kmh,
           heading_deg = EXCLUDED.heading_deg,
           device_os = COALESCE(EXCLUDED.device_os, driver_presence.device_os),
           app_version = COALESCE(EXCLUDED.app_version, driver_presence.app_version),
           battery_pct = EXCLUDED.battery_pct,
           last_seen = NOW()`,
        [driverId, userId, lat, lng, service ?? null, accuracy_m ?? null, speed_kmh ?? null, heading_deg ?? null,
         device_os ?? null, app_version ?? null, battery_pct ?? null]
      )
    } finally {
      client.release()
    }

    return NextResponse.json({ ok: true, nextHeartbeatSec: 10 })
  } catch (error) {
    console.error('Heartbeat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
