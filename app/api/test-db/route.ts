import { NextResponse } from 'next/server'
import { pool } from '@/lib/supabase-db'

export async function GET() {
  try {
    console.log('Testing database connection...')
    const client = await pool.connect()
    console.log('Database connection successful')
    
    const result = await client.query('SELECT NOW() as current_time')
    client.release()
    
    console.log('Database query successful:', result.rows[0])
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful',
      timestamp: result.rows[0].current_time
    })
  } catch (error) {
    console.error('Database connection test failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null
    }, { status: 500 })
  }
}
