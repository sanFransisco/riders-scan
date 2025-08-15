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
      const typeRes = await client.query(
        `SELECT data_type FROM information_schema.columns WHERE table_name='users' AND column_name='role' LIMIT 1`
      )
      const dataType = (typeRes.rows[0]?.data_type || 'text').toUpperCase()
      if (dataType.includes('ARRAY')) {
        await client.query(
          `UPDATE users SET 
             role = (
               WITH arr AS (
                 SELECT (
                   CASE 
                     WHEN role IS NULL THEN ARRAY[]::TEXT[]
                     ELSE role
                   END
                 ) AS a
               )
               SELECT CASE WHEN array_position(a, $1) IS NULL THEN array_append(a, $1) ELSE a END FROM arr
             ),
             updated_at = NOW()
           WHERE id = $2`,
          [role, session.user.id]
        )
      } else {
        // TEXT column: maintain curly-brace string
        await client.query(
          `UPDATE users SET 
             role = (
               CASE 
                 WHEN role IS NULL OR role = '' THEN '{' || $1 || '}'
                 WHEN role LIKE '{%' THEN CASE WHEN role LIKE '%' || $1 || '%' THEN role ELSE regexp_replace(role, '}$', ',' || $1 || '}', 1) END
                 ELSE '{' || role || ',' || $1 || '}'
               END
             ),
             updated_at = NOW()
           WHERE id = $2`,
          [role, session.user.id]
        )
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
