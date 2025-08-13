import { NextRequest, NextResponse } from 'next/server'
import { deleteReview, getReviewById } from '@/lib/supabase-db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewId = params.id

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

// Optional: GET endpoint to retrieve a specific review
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewId = params.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(reviewId)) {
      return NextResponse.json({ error: 'Invalid review ID format' }, { status: 400 })
    }

    const review = await getReviewById(reviewId)

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    return NextResponse.json(review)
  } catch (error) {
    console.error('Error getting review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
