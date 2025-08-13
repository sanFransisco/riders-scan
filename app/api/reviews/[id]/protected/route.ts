import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { deleteReview, getReviewById } from '@/lib/supabase-db'
import { pool } from '@/lib/supabase-db'

// Helper function to check user permissions
async function checkUserPermissions(userId: string, reviewId: string): Promise<{ canDelete: boolean; reason?: string }> {
  try {
    const client = await pool.connect()
    
    // Get user role
    const userResult = await client.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    )
    
    if (userResult.rows.length === 0) {
      client.release()
      return { canDelete: false, reason: 'User not found' }
    }
    
    const userRole = userResult.rows[0].role
    
    // Admins and moderators can delete any review
    if (userRole === 'admin' || userRole === 'moderator') {
      client.release()
      return { canDelete: true }
    }
    
    // Regular users can only delete their own reviews
    const reviewResult = await client.query(
      'SELECT user_id FROM reviews WHERE id = $1',
      [reviewId]
    )
    
    client.release()
    
    if (reviewResult.rows.length === 0) {
      return { canDelete: false, reason: 'Review not found' }
    }
    
    const reviewUserId = reviewResult.rows[0].user_id
    
    if (reviewUserId === userId) {
      return { canDelete: true }
    } else {
      return { canDelete: false, reason: 'You can only delete your own reviews' }
    }
  } catch (error) {
    console.error('Error checking user permissions:', error)
    return { canDelete: false, reason: 'Error checking permissions' }
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession()
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const reviewId = params.id
    const userId = session.user.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(reviewId)) {
      return NextResponse.json({ error: 'Invalid review ID format' }, { status: 400 })
    }

    // Check if review exists
    const existingReview = await getReviewById(reviewId)
    if (!existingReview) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Check user permissions
    const { canDelete, reason } = await checkUserPermissions(userId, reviewId)
    
    if (!canDelete) {
      return NextResponse.json({ 
        error: 'Insufficient permissions', 
        reason: reason 
      }, { status: 403 })
    }

    // Delete the review
    const deleted = await deleteReview(reviewId)

    if (deleted) {
      return NextResponse.json({ 
        success: true, 
        message: 'Review deleted successfully' 
      })
    } else {
      return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error deleting review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
