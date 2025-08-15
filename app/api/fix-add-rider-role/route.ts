import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/supabase-db'

export async function POST(_req: NextRequest) {
  try {
    const client = await pool.connect()
    try {
      // Append 'rider' for both schema variants (TEXT[] or TEXT-as-curly-string)
      await client.query(`
        UPDATE users
        SET role = (
          CASE
            WHEN pg_typeof(role)::text = '_text' THEN
              CASE WHEN NOT ('rider' = ANY(role)) THEN array_append(role, 'rider') ELSE role END
            ELSE
              CASE
                WHEN role IS NULL OR role = '' THEN '{rider}'
                WHEN role LIKE '{%' THEN CASE WHEN role LIKE '%rider%' THEN role ELSE regexp_replace(role, '}$', ',rider}', 1) END
                ELSE '{' || role || ',rider}'
              END
          END
        ),
        updated_at = NOW();
      `)

      const res = await client.query(`SELECT email, role FROM users ORDER BY created_at DESC LIMIT 10`)
      return NextResponse.json({ ok: true, sample: res.rows })
    } finally {
      client.release()
    }
  } catch (e) {
    console.error('Fix rider role error:', e)
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}
