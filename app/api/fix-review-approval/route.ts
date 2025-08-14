import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/supabase-db'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Adding review approval field...')
    const client = await pool.connect()
    try {
      // Add review_approved field to reviews table
      console.log('Adding review_approved field...')
      await client.query(`
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS review_approved BOOLEAN DEFAULT false;
      `)
      
      // Update schema version
      console.log('Updating schema version...')
      await client.query(`
        UPDATE schema_version SET version = version + 1, updated_at = NOW();
      `)
      
      // Verify the fix
      const columnCheck = await client.query(`
        SELECT column_name, data_type, column_default, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'reviews' AND column_name = 'review_approved'
      `)
      
      console.log('✅ Review approval field added successfully!')
      console.log('Column info:', columnCheck.rows[0])
      
      return NextResponse.json({ 
        success: true, 
        message: 'Review approval field added successfully',
        columnInfo: columnCheck.rows[0]
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ Error adding review approval field:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 })
  }
}
