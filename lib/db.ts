import { sql } from '@vercel/postgres';

// Check if database is available
function isDatabaseAvailable() {
  return process.env.POSTGRES_URL || (process.env.POSTGRES_HOST && process.env.POSTGRES_DATABASE);
}

export interface Driver {
  id: string;
  full_name: string;
  license_plate: string;
  created_at: Date;
}

export interface Review {
  id: string;
  driver_id: string;
  overall_rating: number;
  pleasantness_rating: number;
  arrival_time_rating: number;
  ride_speed_rating: number;
  was_on_time: boolean;
  waiting_time_minutes?: number;
  price_fair: boolean;
  comment?: string;
  ride_city?: string;
  ride_date: Date;
  created_at: Date;
}

export interface DriverAnalytics {
  id: string;
  full_name: string;
  license_plate: string;
  total_reviews: number;
  avg_overall: number;
  avg_pleasantness: number;
  avg_arrival_time: number;
  avg_ride_speed: number;
  on_time_percentage: number;
  price_fair_percentage: number;
  avg_waiting_time?: number;
  service_cities: string[];
}

// Initialize database tables
export async function initDatabase() {
  if (!isDatabaseAvailable()) {
    throw new Error('Database not configured. Please set POSTGRES_URL or POSTGRES_HOST/DATABASE environment variables.');
  }

  try {
    // Create drivers table
    await sql`
      CREATE TABLE IF NOT EXISTS drivers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name VARCHAR NOT NULL,
        license_plate VARCHAR NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create reviews table
    await sql`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
        overall_rating INTEGER CHECK (1 <= overall_rating AND overall_rating <= 5),
        pleasantness_rating INTEGER CHECK (1 <= pleasantness_rating AND pleasantness_rating <= 5),
        arrival_time_rating INTEGER CHECK (1 <= arrival_time_rating AND arrival_time_rating <= 5),
        ride_speed_rating INTEGER CHECK (1 <= ride_speed_rating AND ride_speed_rating <= 5),
        was_on_time BOOLEAN NOT NULL,
        waiting_time_minutes INTEGER CHECK (waiting_time_minutes > 0),
        price_fair BOOLEAN NOT NULL,
        comment TEXT,
        ride_city VARCHAR,
        ride_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating database tables:', error);
    throw error;
  }
}

// Get driver analytics
export async function getDriverAnalytics(driverId: string): Promise<DriverAnalytics | null> {
  if (!isDatabaseAvailable()) {
    throw new Error('Database not configured. Please set POSTGRES_URL or POSTGRES_HOST/DATABASE environment variables.');
  }

  try {
    const result = await sql`
      SELECT 
        d.id,
        d.full_name,
        d.license_plate,
        COUNT(r.id) as total_reviews,
        ROUND(AVG(r.overall_rating), 1) as avg_overall,
        ROUND(AVG(r.pleasantness_rating), 1) as avg_pleasantness,
        ROUND(AVG(r.arrival_time_rating), 1) as avg_arrival_time,
        ROUND(AVG(r.ride_speed_rating), 1) as avg_ride_speed,
        ROUND((COUNT(CASE WHEN r.was_on_time THEN 1 END) * 100.0 / COUNT(*)), 1) as on_time_percentage,
        ROUND((COUNT(CASE WHEN r.price_fair THEN 1 END) * 100.0 / COUNT(*)), 1) as price_fair_percentage,
        ROUND(AVG(r.waiting_time_minutes) FILTER (WHERE r.was_on_time = false), 1) as avg_waiting_time,
        ARRAY_AGG(DISTINCT r.ride_city) FILTER (WHERE r.ride_city IS NOT NULL) as service_cities
      FROM drivers d
      LEFT JOIN reviews r ON d.id = r.driver_id
      WHERE d.id = ${driverId}
      GROUP BY d.id, d.full_name, d.license_plate
    `;

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as DriverAnalytics;
  } catch (error) {
    console.error('Error getting driver analytics:', error);
    throw error;
  }
}

// Search drivers
export async function searchDrivers(query: string): Promise<DriverAnalytics[]> {
  if (!isDatabaseAvailable()) {
    throw new Error('Database not configured. Please set POSTGRES_URL or POSTGRES_HOST/DATABASE environment variables.');
  }

  try {
    const result = await sql`
      SELECT 
        d.id,
        d.full_name,
        d.license_plate,
        COUNT(r.id) as total_reviews,
        ROUND(AVG(r.overall_rating), 1) as avg_overall,
        ROUND(AVG(r.pleasantness_rating), 1) as avg_pleasantness,
        ROUND(AVG(r.arrival_time_rating), 1) as avg_arrival_time,
        ROUND(AVG(r.ride_speed_rating), 1) as avg_ride_speed,
        ROUND((COUNT(CASE WHEN r.was_on_time THEN 1 END) * 100.0 / COUNT(*)), 1) as on_time_percentage,
        ROUND((COUNT(CASE WHEN r.price_fair THEN 1 END) * 100.0 / COUNT(*)), 1) as price_fair_percentage,
        ROUND(AVG(r.waiting_time_minutes) FILTER (WHERE r.was_on_time = false), 1) as avg_waiting_time,
        ARRAY_AGG(DISTINCT r.ride_city) FILTER (WHERE r.ride_city IS NOT NULL) as service_cities
      FROM drivers d
      LEFT JOIN reviews r ON d.id = r.driver_id
      WHERE d.full_name ILIKE ${`%${query}%`} OR d.license_plate ILIKE ${`%${query}%`}
      GROUP BY d.id, d.full_name, d.license_plate
      ORDER BY avg_overall DESC NULLS LAST, total_reviews DESC
    `;

    return result.rows as DriverAnalytics[];
  } catch (error) {
    console.error('Error searching drivers:', error);
    throw error;
  }
}

// Get driver by ID
export async function getDriverById(id: string): Promise<Driver | null> {
  try {
    const result = await sql`
      SELECT * FROM drivers WHERE id = ${id}
    `;

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as Driver;
  } catch (error) {
    console.error('Error getting driver:', error);
    throw error;
  }
}

// Get reviews for a driver
export async function getDriverReviews(driverId: string): Promise<Review[]> {
  try {
    const result = await sql`
      SELECT * FROM reviews 
      WHERE driver_id = ${driverId}
      ORDER BY created_at DESC
    `;

    return result.rows as Review[];
  } catch (error) {
    console.error('Error getting driver reviews:', error);
    throw error;
  }
}

// Create or find driver
export async function createOrFindDriver(fullName: string, licensePlate: string): Promise<Driver> {
  try {
    // First try to find existing driver
    const existingResult = await sql`
      SELECT * FROM drivers WHERE license_plate = ${licensePlate}
    `;

    if (existingResult.rows.length > 0) {
      return existingResult.rows[0] as Driver;
    }

    // Create new driver
    const result = await sql`
      INSERT INTO drivers (full_name, license_plate)
      VALUES (${fullName}, ${licensePlate})
      RETURNING *
    `;

    return result.rows[0] as Driver;
  } catch (error) {
    console.error('Error creating/finding driver:', error);
    throw error;
  }
}

// Create review
export async function createReview(reviewData: Omit<Review, 'id' | 'created_at'>): Promise<Review> {
  try {
    const result = await sql`
      INSERT INTO reviews (
        driver_id, overall_rating, pleasantness_rating, arrival_time_rating,
        ride_speed_rating, was_on_time, waiting_time_minutes, price_fair,
        comment, ride_city, ride_date
      )
      VALUES (
        ${reviewData.driver_id}, ${reviewData.overall_rating}, ${reviewData.pleasantness_rating},
        ${reviewData.arrival_time_rating}, ${reviewData.ride_speed_rating}, ${reviewData.was_on_time},
        ${reviewData.waiting_time_minutes}, ${reviewData.price_fair}, ${reviewData.comment},
        ${reviewData.ride_city}, ${reviewData.ride_date.toISOString().split('T')[0]}
      )
      RETURNING *
    `;

    return result.rows[0] as Review;
  } catch (error) {
    console.error('Error creating review:', error);
    throw error;
  }
}
