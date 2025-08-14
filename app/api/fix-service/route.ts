import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/supabase-db'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Fixing service field constraint...')
    
    const client = await pool.connect()
    
    try {
      // Fix service field constraint to allow NULL values
      await client.query(`
        ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_service_check;
        ALTER TABLE reviews ADD CONSTRAINT reviews_service_check 
          CHECK (service IS NULL OR service IN ('Yango', 'Gett', 'Uber', 'Other'));
      `)
      
      console.log('✅ Service field constraint fixed!')
      
      return NextResponse.json({ 
        success: true, 
        message: 'Service field constraint updated to allow NULL values'
      })
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('❌ Error fixing service constraint:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
