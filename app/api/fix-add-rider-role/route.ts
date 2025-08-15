import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/supabase-db'

export async function POST(_req: NextRequest) {
  try {
    const client = await pool.connect()
    try {
      // 1) Ensure users.role is TEXT[] (migrate from TEXT if needed)
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='users' AND column_name='role' AND data_type <> 'ARRAY'
          ) THEN
            ALTER TABLE users 
            ALTER COLUMN role TYPE TEXT[]
            USING (
              CASE 
                WHEN role IS NULL THEN ARRAY[]::TEXT[]
                WHEN role LIKE '{%' THEN string_to_array(replace(replace(role,'{',''),'}',''),',')::TEXT[]
                ELSE ARRAY[role]::TEXT[]
              END
            );
          END IF;
        END $$;
      `)

      // 2) Append 'rider' where missing
      await client.query(`
        UPDATE users
        SET role = CASE
          WHEN role IS NULL OR array_length(role,1) IS NULL THEN ARRAY['rider']::TEXT[]
          WHEN NOT ('rider' = ANY(role)) THEN array_append(role, 'rider')
          ELSE role END,
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
