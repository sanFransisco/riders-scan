import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { serverAuthOptions } from '@/app/api/auth/[...nextauth]/route'
import { pool } from '@/lib/supabase-db'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(serverAuthOptions)
    console.log('Admin users API - Session:', session)
    
    if (!session || !session.user?.id) {
      console.log('Admin users API - No session or user ID')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if current user is admin
    const client = await pool.connect()
    const adminCheck = await client.query(
      'SELECT role FROM users WHERE id = $1',
      [session.user.id]
    )
    
    if (adminCheck.rows.length === 0 || !adminCheck.rows[0].role.includes('admin')) {
      client.release()
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get all users
    const result = await client.query(
      'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC'
    )

    client.release()

    return NextResponse.json({
      users: result.rows
    })

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
