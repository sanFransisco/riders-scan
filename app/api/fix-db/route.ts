import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/supabase-db'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting database fix...')
    
    const client = await pool.connect()
    
    try {
      // 1. Add service column to reviews table
      console.log('Adding service column to reviews table...')
      await client.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'service') THEN
            ALTER TABLE reviews ADD COLUMN service TEXT CHECK (service IN ('Yango', 'Gett', 'Uber', 'Other'));
            RAISE NOTICE 'Added service column to reviews table';
          ELSE
            RAISE NOTICE 'Service column already exists in reviews table';
          END IF;
        END $$;
      `)
      
      // 2. Update schema version to 3
      console.log('Updating schema version...')
      await client.query(`
        INSERT INTO schema_version (id, version) VALUES (1, 3) 
        ON CONFLICT (id) DO UPDATE SET version = 3, updated_at = NOW()
      `)
      
      // 3. Verify the service column was added
      console.log('Verifying service column...')
      const reviewsColumns = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'reviews' AND column_name = 'service'
      `)
      
      const schemaVersion = await client.query('SELECT version FROM schema_version WHERE id = 1')
      
      console.log('✅ Service column fix completed!')
      
      return NextResponse.json({ 
        success: true, 
        message: 'Service column added successfully',
        serviceColumnExists: reviewsColumns.rows.length > 0,
        schemaVersion: schemaVersion.rows[0]?.version || 'unknown'
      })
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('❌ Error fixing database:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 })
  }
}
