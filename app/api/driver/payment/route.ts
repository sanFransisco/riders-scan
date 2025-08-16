import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { serverAuthOptions } from '@/lib/auth-config'
import { pool } from '@/lib/supabase-db'

export async function GET() {
  try {
    const session = await getServerSession(serverAuthOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const client = await pool.connect()
    try {
      const res = await client.query(`SELECT payment_provider, payment_link, payment_active FROM drivers WHERE user_id = $1`, [session.user.id])
      return NextResponse.json({ ok: true, payment: res.rows[0] || null })
    } finally { client.release() }
  } catch { return NextResponse.json({ error: 'Internal server error' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(serverAuthOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    const { payment_link, payment_provider = 'meshulam', payment_active = false } = body || {}
    if (!payment_link || typeof payment_link !== 'string') return NextResponse.json({ error: 'payment_link required' }, { status: 400 })
    const client = await pool.connect()
    try {
      await client.query(`UPDATE drivers SET payment_link = $1, payment_provider = $2, payment_active = $3, updated_at = NOW() WHERE user_id = $4`,
        [payment_link, payment_provider, payment_active, session.user.id])
      return NextResponse.json({ ok: true })
    } finally { client.release() }
  } catch { return NextResponse.json({ error: 'Internal server error' }, { status: 500 }) }
}


