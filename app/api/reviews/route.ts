import { NextRequest, NextResponse } from 'next/server'
import { createOrFindDriver, createReview } from '@/lib/supabase-db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      driverName,
      licensePlate,
      overallRating,
      pleasantnessRating,
      rideSpeedSatisfied,
      wasOnTime,
      waitingTimeMinutes,
      priceFair,
      comment,
      rideCity,
      rideDate
    } = body

    // Validate required fields
    if (!driverName || !licensePlate || !overallRating || !rideDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate ratings
    const ratings = [overallRating, pleasantnessRating]
    for (const rating of ratings) {
      if (rating && (rating < 1 || rating > 5)) {
        return NextResponse.json({ error: 'Ratings must be between 1 and 5' }, { status: 400 })
      }
    }

    // Create or find driver
    const driver = await createOrFindDriver(driverName, licensePlate)

    // Create review
    const review = await createReview({
      driver_id: driver.id,
      overall_rating: overallRating,
      pleasantness_rating: pleasantnessRating,
      ride_speed_satisfied: rideSpeedSatisfied,
      was_on_time: wasOnTime,
      waiting_time_minutes: wasOnTime ? undefined : waitingTimeMinutes,
      price_fair: priceFair,
      review_text: comment,
      ride_city: rideCity
    })

    return NextResponse.json({ success: true, review }, { status: 201 })
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
