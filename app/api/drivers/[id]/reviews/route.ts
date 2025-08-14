import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/supabase-db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await pool.connect()
    
    const result = await client.query(`
      SELECT 
        r.id,
        r.overall_rating,
        r.pleasantness_rating,
        r.ride_speed_satisfied,
        r.was_on_time,
        r.waiting_time_minutes,
        r.price_fair,
        r.review_text,
        r.ride_city,
        r.service,
        r.review_approved,
        r.created_at
      FROM reviews r
      WHERE r.driver_id = $1
      ORDER BY r.created_at DESC
    `, [params.id])

    client.release()
    
    return NextResponse.json({ 
      success: true, 
      reviews: result.rows 
    })
  } catch (error) {
    console.error('Error fetching driver reviews:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
