import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function GET() {
  try {
    // Simple test query
    const result = await sql`SELECT NOW() as current_time`
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful',
      time: result.rows[0].current_time
    })
  } catch (error) {
    console.error('Database connection test failed:', error)
    
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: error.message,
        stack: error.stack
      }, { status: 500 })
    }
    
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
  }
}
