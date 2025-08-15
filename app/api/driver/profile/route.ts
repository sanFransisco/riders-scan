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
        `SELECT id, user_id, full_name, license_plate, created_at, updated_at
         FROM drivers WHERE user_id = $1 LIMIT 1`,
        [session.user.id]
      )
      return NextResponse.json({ ok: true, driver: res.rows[0] || null })
    } finally {
      client.release()
    }
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


