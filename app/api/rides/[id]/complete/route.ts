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
      // Only driver can complete the ride
      const res = await client.query('SELECT driver_id, status FROM rides WHERE id = $1', [params.id])
      if (res.rows.length === 0) return NextResponse.json({ error: 'Ride not found' }, { status: 404 })
      if (res.rows[0].driver_id !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      // Parse optional amount/currency from body to store fare for offline payment
      let amount: number | null = null
      let currency: string | null = null
      try {
        const body = await req.json().catch(() => null)
        if (body && typeof body.amount !== 'undefined') {
          const n = Number(body.amount)
          if (!Number.isNaN(n) && n >= 0 && n <= 1000000) amount = Number(n.toFixed(2))
        }
        if (body && typeof body.currency === 'string' && body.currency.length > 0) {
          currency = body.currency
        }
      } catch {}

      if (amount != null && currency != null) {
        await client.query(`UPDATE rides SET status = 'completed', ended_at = NOW(), amount = $2, currency = $3 WHERE id = $1`, [params.id, amount, currency])
      } else if (amount != null) {
        await client.query(`UPDATE rides SET status = 'completed', ended_at = NOW(), amount = $2 WHERE id = $1`, [params.id, amount])
      } else {
        await client.query(`UPDATE rides SET status = 'completed', ended_at = NOW() WHERE id = $1`, [params.id])
      }
      return NextResponse.json({ ok: true, amount, currency })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Ride complete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


