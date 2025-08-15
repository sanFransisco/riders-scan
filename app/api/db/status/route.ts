import { NextResponse } from 'next/server'
import { pool } from '@/lib/supabase-db'

export async function GET() {
  try {
    const client = await pool.connect()
    try {
      const versionRes = await client.query(`SELECT version FROM schema_version WHERE id = 1`)
      const tablesRes = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `)
      const extRes = await client.query(`
        SELECT name, installed_version
        FROM pg_available_extensions
        WHERE name = 'postgis'
      `)

      return NextResponse.json({
        ok: true,
        schemaVersion: versionRes.rows[0]?.version ?? null,
        tables: tablesRes.rows.map((r: any) => r.table_name),
        postgis: extRes.rows[0] || null,
      })
    } finally {
      client.release()
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 })
  }
}


