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
      // Assume TEXT[] for role column; handle if column is still TEXT by parsing first
      await client.query(
        `UPDATE users SET 
           role = (
             WITH s AS (
               SELECT CASE
                 WHEN pg_typeof(role)::text = '_text' THEN role
                 WHEN role IS NULL OR role = '' THEN ARRAY[]::TEXT[]
                 WHEN role LIKE '{%' THEN string_to_array(replace(replace(role,'{',''),'}',''), ',')::TEXT[]
                 ELSE string_to_array(role, ',')::TEXT[]
               END AS arr
             )
             SELECT CASE WHEN array_position(arr, $1) IS NULL THEN array_append(arr, $1) ELSE arr END FROM s
           ),
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
