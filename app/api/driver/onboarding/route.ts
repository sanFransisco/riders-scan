import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { serverAuthOptions } from '@/lib/auth-config'
import { pool } from '@/lib/supabase-db'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(serverAuthOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { license_plate, full_name } = await req.json()

    // license plate required (7 digits per UX) but accept any non-empty to avoid blocking
    if (!license_plate || typeof license_plate !== 'string') {
      return NextResponse.json({ error: 'license_plate required' }, { status: 400 })
    }

    const client = await pool.connect()
    try {
      // Create or link driver record to this user
      const existing = await client.query(`SELECT id, user_id FROM drivers WHERE license_plate = $1`, [license_plate])
      if (existing.rows.length > 0) {
        // Link to this user if not already linked
        await client.query(
          `UPDATE drivers SET user_id = $1, full_name = COALESCE($2, full_name), updated_at = NOW() WHERE id = $3`,
          [session.user.id, full_name ?? null, existing.rows[0].id]
        )
      } else {
        // Create driver and link to this user
        await client.query(
          `INSERT INTO drivers (full_name, license_plate, user_id) VALUES ($1, $2, $3)`,
          [full_name ?? null, license_plate, session.user.id]
        )
      }
      return NextResponse.json({ ok: true })
    } finally {
      client.release()
    }
  } catch (e) {
    console.error('Driver onboarding error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


