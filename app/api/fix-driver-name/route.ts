import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/supabase-db'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Fixing driver name constraint...')
    const client = await pool.connect()
    try {
      // Remove NOT NULL constraint from full_name column
      console.log('Removing NOT NULL constraint from full_name column...')
      await client.query(`
        ALTER TABLE drivers ALTER COLUMN full_name DROP NOT NULL;
      `)
      
      // Update schema version
      console.log('Updating schema version...')
      await client.query(`
        UPDATE schema_version SET version = version + 1, updated_at = NOW();
      `)
      
      // Verify the fix
      const constraintCheck = await client.query(`
        SELECT column_name, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'drivers' AND column_name = 'full_name'
      `)
      
      console.log('✅ Driver name constraint fix completed!')
      console.log('Column info:', constraintCheck.rows[0])
      
      return NextResponse.json({ 
        success: true, 
        message: 'Driver name constraint fixed successfully - full_name now allows NULL values',
        columnInfo: constraintCheck.rows[0]
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ Error fixing driver name constraint:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 })
  }
}
