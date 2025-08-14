import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { serverAuthOptions } from '@/lib/auth-config'
import { pool } from '@/lib/supabase-db'

export async function GET(request: NextRequest) {
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
    client.release()

    if (!adminCheck.rows[0]) {
      return NextResponse.json({ error: 'Admin or moderator access required' }, { status: 403 })
    }
    
    // Handle PostgreSQL array format for role check
    const userRole = adminCheck.rows[0].role
    const isAdmin = Array.isArray(userRole) ? userRole.includes('admin') : 
                   (typeof userRole === 'string' && userRole.includes('admin'))
    const isModerator = Array.isArray(userRole) ? userRole.includes('moderator') : 
                       (typeof userRole === 'string' && userRole.includes('moderator'))
    
    if (!isAdmin && !isModerator) {
      return NextResponse.json({ error: 'Admin or moderator access required' }, { status: 403 })
    }

    // Fetch all reviews with driver information
    const client2 = await pool.connect()
    const result = await client2.query(`
      SELECT 
        r.id,
        r.driver_id,
        d.full_name as driver_name,
        d.license_plate,
        r.overall_rating,
        r.pleasantness_rating,
        r.ride_speed_satisfied,
        r.was_on_time,
        r.waiting_time_minutes,
        r.price_fair,
        r.review_text,
        r.ride_city,
        r.service,
        r.created_at
      FROM reviews r
      JOIN drivers d ON r.driver_id = d.id
      ORDER BY r.created_at DESC
    `)
    client2.release()

    return NextResponse.json({ 
      reviews: result.rows,
      total: result.rows.length
    })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
