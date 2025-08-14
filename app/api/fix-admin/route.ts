import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/supabase-db'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Fixing admin role...')
    
    const client = await pool.connect()
    
    try {
      // Ensure admin user has correct role
      console.log('Setting admin role for yalibar1121@gmail.com...')
      await client.query(`
        UPDATE users 
        SET role = ARRAY['admin']::TEXT[] 
        WHERE email = 'yalibar1121@gmail.com'
      `)
      
      // Verify the fix
      const userResult = await client.query(`
        SELECT email, role FROM users WHERE email = 'yalibar1121@gmail.com'
      `)
      
      console.log('✅ Admin role fix completed!')
      console.log('User data:', userResult.rows[0])
      
      return NextResponse.json({ 
        success: true, 
        message: 'Admin role fixed successfully',
        user: userResult.rows[0]
      })
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('❌ Error fixing admin role:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 })
  }
}
