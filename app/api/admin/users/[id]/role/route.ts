import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { serverAuthOptions } from '@/lib/auth-config'
import { pool } from '@/lib/supabase-db'

// Helper function to check if user is admin
async function checkAdminAccess(userId: string) {
  const client = await pool.connect()
  const adminCheck = await client.query(
    'SELECT role FROM users WHERE id = $1',
    [userId]
  )
  
  if (adminCheck.rows.length === 0) {
    client.release()
    return false
  }
  
  // Handle PostgreSQL array format for role check
  const userRole = adminCheck.rows[0].role
  const isAdmin = Array.isArray(userRole) ? userRole.includes('admin') : 
                 (typeof userRole === 'string' && userRole.includes('admin'))
  
  client.release()
  return isAdmin
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(serverAuthOptions)
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if current user is admin
    const isAdmin = await checkAdminAccess(session.user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const userId = params.id
    const { role } = await request.json()

    // Validate role
    const validRoles = ['user', 'moderator', 'admin']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be one of: user, moderator, admin' 
      }, { status: 400 })
    }

    // Update user role - store as array
    const client = await pool.connect()
    const result = await client.query(
      'UPDATE users SET role = ARRAY[$1]::TEXT[], updated_at = NOW() WHERE id = $2 RETURNING id, email, role',
      [role, userId]
    )
    client.release()

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'User role updated successfully',
      user: result.rows[0]
    })

  } catch (error) {
    console.error('Error updating user role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get user role
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(serverAuthOptions)
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if current user is admin
    const isAdmin = await checkAdminAccess(session.user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const userId = params.id

    // Get user role
    const client = await pool.connect()
    const result = await client.query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [userId]
    )
    client.release()

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      user: result.rows[0]
    })

  } catch (error) {
    console.error('Error getting user role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
