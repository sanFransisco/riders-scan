import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { serverAuthOptions } from '@/lib/auth-config'
import { pool } from '@/lib/supabase-db'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(serverAuthOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or moderator
    const client = await pool.connect()
    const userCheck = await client.query(
      'SELECT role FROM users WHERE id = $1',
      [session.user.id]
    )
    
    if (userCheck.rows.length === 0) {
      client.release()
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const userRole = userCheck.rows[0].role
    const isAdmin = Array.isArray(userRole) ? userRole.includes('admin') : 
                   (typeof userRole === 'string' && userRole.includes('admin'))
    const isModerator = Array.isArray(userRole) ? userRole.includes('moderator') : 
                       (typeof userRole === 'string' && userRole.includes('moderator'))
    
    if (!isAdmin && !isModerator) {
      client.release()
      return NextResponse.json({ error: 'Admin or moderator access required' }, { status: 403 })
    }

    const { approved } = await request.json()
    
    // Update review approval status
    const result = await client.query(
      'UPDATE reviews SET review_approved = $1 WHERE id = $2 RETURNING id, review_approved',
      [approved, params.id]
    )
    
    client.release()
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      success: true, 
      review: result.rows[0] 
    })
  } catch (error) {
    console.error('Error approving review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
