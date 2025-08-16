import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { serverAuthOptions } from '@/lib/auth-config'
import { pool } from '@/lib/supabase-db'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(serverAuthOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { role, license_plate, full_name } = await req.json()
    if (role !== 'rider' && role !== 'driver') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    const client = await pool.connect()
    try {
      try {
        await client.query('BEGIN')
        // TEXT[] only: append role if missing
        await client.query(
          `UPDATE users SET 
             role = CASE WHEN array_position(role, $1) IS NULL THEN array_append(role, $1) ELSE role END,
             updated_at = NOW()
           WHERE id = $2`,
          [role, session.user.id]
        )
        if (role === 'driver') {
          if (!license_plate || typeof license_plate !== 'string' || !/^\d{7}$/.test(license_plate)) {
            await client.query('ROLLBACK')
            return NextResponse.json({ error: 'license_plate must be a 7-digit string' }, { status: 400 })
          }
          const existing = await client.query(`SELECT id FROM drivers WHERE license_plate = $1`, [license_plate])
          if (existing.rows.length > 0) {
            await client.query(
              `UPDATE drivers SET user_id = $1, full_name = COALESCE($2, full_name), updated_at = NOW() WHERE id = $3`,
              [session.user.id, full_name ?? null, existing.rows[0].id]
            )
          } else {
            await client.query(
              `INSERT INTO drivers (full_name, license_plate, user_id) VALUES ($1, $2, $3)`,
              [full_name ?? null, license_plate, session.user.id]
            )
          }
        }
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      }
      return NextResponse.json({ ok: true })
    } finally {
      client.release()
    }
  } catch (e) {
    console.error('Onboarding error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
