import { NextResponse } from 'next/server'
import { initDatabase } from '@/lib/supabase-db'

export async function POST() {
  try {
    await initDatabase()
    return NextResponse.json({ success: true, message: 'Database initialized successfully' })
  } catch (error) {
    console.error('Error initializing database:', error)
    
    // Return more detailed error information
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: 'Failed to initialize database',
        details: error.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({ error: 'Failed to initialize database' }, { status: 500 })
  }
}

export async function GET() {
  // Convenience: allow triggering init via GET in controlled environments
  try {
    await initDatabase()
    return NextResponse.json({ success: true, message: 'Database initialized successfully' })
  } catch (error) {
    console.error('Error initializing database (GET):', error)
    if (error instanceof Error) {
      return NextResponse.json({ error: 'Failed to initialize database', details: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: 'Failed to initialize database' }, { status: 500 })
  }
}
