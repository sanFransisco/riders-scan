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
      
      // 3. Fix user roles - handle each case separately
      console.log('Fixing user roles...')
      
      // First, fix NULL roles
      await client.query(`
        UPDATE users 
        SET role = ARRAY['user']::TEXT[] 
        WHERE role IS NULL
      `)
      
      // Then fix empty array roles
      await client.query(`
        UPDATE users 
        SET role = ARRAY['user']::TEXT[] 
        WHERE role = '{}'::TEXT[]
      `)
      
      // Then fix roles with empty string
      await client.query(`
        UPDATE users 
        SET role = ARRAY['user']::TEXT[] 
        WHERE role = ARRAY['']::TEXT[]
      `)
      
      // 4. Ensure admin user has correct role
      console.log('Setting admin role...')
      await client.query(`
        UPDATE users 
        SET role = ARRAY['admin']::TEXT[] 
        WHERE email = 'yalibar1121@gmail.com'
      `)
      
      // 5. Verify fixes
      console.log('Verifying fixes...')
      
      const reviewsColumns = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'reviews' 
        ORDER BY ordinal_position
      `)
      console.log('Reviews table columns:', reviewsColumns.rows)
      
      const schemaVersion = await client.query('SELECT version FROM schema_version WHERE id = 1')
      console.log('Schema version:', schemaVersion.rows[0])
      
      const users = await client.query('SELECT email, role FROM users LIMIT 5')
      console.log('User roles:', users.rows)
      
      console.log('✅ Database fixes completed successfully!')
      
      return NextResponse.json({ 
        success: true, 
        message: 'Database fixes completed successfully',
        reviewsColumns: reviewsColumns.rows,
        schemaVersion: schemaVersion.rows[0],
        users: users.rows
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
