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
      // Only driver can start the ride
      const res = await client.query('SELECT driver_id, status FROM rides WHERE id = $1', [params.id])
      if (res.rows.length === 0) return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
      if (res.rows[0].driver_id !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      await client.query(`UPDATE rides SET status = 'ontrip', started_at = NOW() WHERE id = $1`, [params.id])
      return NextResponse.json({ ok: true })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Ride start error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
