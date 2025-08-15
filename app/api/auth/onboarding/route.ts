import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { serverAuthOptions } from '@/lib/auth-config'
import { pool } from '@/lib/supabase-db'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(serverAuthOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { role } = await req.json()
    if (role !== 'rider' && role !== 'driver') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    const client = await pool.connect()
    try {
      // TEXT[] only: append role if missing
      await client.query(
        `UPDATE users SET 
           role = CASE WHEN array_position(role, $1) IS NULL THEN array_append(role, $1) ELSE role END,
           updated_at = NOW()
         WHERE id = $2`,
        [role, session.user.id]
      )
      return NextResponse.json({ ok: true })
    } finally {
      client.release()
    }
  } catch (e) {
    console.error('Onboarding error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
