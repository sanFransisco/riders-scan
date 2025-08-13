import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { serverAuthOptions } from '@/lib/auth-config'
import { pool } from '@/lib/supabase-db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(serverAuthOptions)
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user has admin or moderator role
    const client = await pool.connect()
    const adminCheck = await client.query(
      'SELECT role FROM users WHERE id = $1',
      [session.user.id]
    )

    if (!adminCheck.rows[0] || !adminCheck.rows[0].role.includes('admin') && !adminCheck.rows[0].role.includes('moderator')) {
      client.release()
      return NextResponse.json({ error: 'Admin or moderator access required' }, { status: 403 })
    }

    // Delete the review
    const result = await client.query(
      'DELETE FROM reviews WHERE id = $1 RETURNING id',
      [params.id]
    )

    client.release()

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Review deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
