import { Pool } from 'pg'

// Create a connection pool
// Create a connection pool with proper SSL handling for Supabase
const createPool = () => {
  const connectionString = process.env.POSTGRES_URL;
  
  if (!connectionString) {
    throw new Error('POSTGRES_URL environment variable is not set');
  }
  
  // Parse the connection string to extract components
  const url = new URL(connectionString);
  
  // For production, use a more permissive SSL configuration
  const config = {
    host: url.hostname,
    port: parseInt(url.port),
    database: url.pathname.slice(1), // Remove leading slash
    user: url.username,
    password: url.password,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined,
      ca: undefined,
      cert: undefined,
      key: undefined
    } : {
      rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
  
  console.log('Creating pool with config:', {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    ssl: !!config.ssl,
    nodeEnv: process.env.NODE_ENV
  });
  
  return new Pool(config);
};

export const pool = createPool()

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
  ride_speed_satisfied: boolean;
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
  ride_speed_satisfied_percentage: number;
  on_time_percentage: number;
  price_fair_percentage: number;
  avg_waiting_time?: number;
  service_cities: string[];
}

// Check if database is available
function isDatabaseAvailable() {
  const hasUrl = !!process.env.POSTGRES_URL;
  console.log('Database availability check:', { 
    hasUrl, 
    urlLength: process.env.POSTGRES_URL?.length || 0,
    nodeEnv: process.env.NODE_ENV 
  });
  return hasUrl;
}

// Initialize database tables
export async function initDatabase() {
  if (!isDatabaseAvailable()) {
    throw new Error('Database not configured. Please set POSTGRES_URL environment variable.');
  }

  try {
    const client = await pool.connect()
    
    // Drop existing tables if they exist
    await client.query(`DROP TABLE IF EXISTS reviews CASCADE`)
    await client.query(`DROP TABLE IF EXISTS drivers CASCADE`)
    
    // Create drivers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name VARCHAR NOT NULL,
        license_plate VARCHAR NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // Create reviews table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
        overall_rating INTEGER CHECK (1 <= overall_rating AND overall_rating <= 5),
        pleasantness_rating INTEGER CHECK (1 <= pleasantness_rating AND pleasantness_rating <= 5),
        ride_speed_satisfied BOOLEAN NOT NULL,
        was_on_time BOOLEAN NOT NULL,
        waiting_time_minutes INTEGER CHECK (waiting_time_minutes > 0),
        price_fair BOOLEAN NOT NULL,
        comment TEXT,
        ride_city VARCHAR,
        ride_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)

    client.release()
    console.log('Database tables created successfully')
  } catch (error) {
    console.error('Error creating database tables:', error)
    throw error
  }
}

// Get driver analytics
export async function getDriverAnalytics(driverId: string): Promise<DriverAnalytics | null> {
  if (!isDatabaseAvailable()) {
    throw new Error('Database not configured. Please set POSTGRES_URL environment variable.');
  }

  try {
    const client = await pool.connect()
    const result = await client.query(`
      SELECT 
        d.id,
        d.full_name,
        d.license_plate,
        COUNT(r.id) as total_reviews,
        ROUND(AVG(r.overall_rating), 1) as avg_overall,
        ROUND(AVG(r.pleasantness_rating), 1) as avg_pleasantness,
        ROUND((COUNT(CASE WHEN r.ride_speed_satisfied THEN 1 END) * 100.0 / COUNT(*)), 1) as ride_speed_satisfied_percentage,
        ROUND((COUNT(CASE WHEN r.was_on_time THEN 1 END) * 100.0 / COUNT(*)), 1) as on_time_percentage,
        ROUND((COUNT(CASE WHEN r.price_fair THEN 1 END) * 100.0 / COUNT(*)), 1) as price_fair_percentage,
        ROUND(AVG(r.waiting_time_minutes) FILTER (WHERE r.was_on_time = false), 1) as avg_waiting_time,
        ARRAY_AGG(DISTINCT r.ride_city) FILTER (WHERE r.ride_city IS NOT NULL) as service_cities
      FROM drivers d
      LEFT JOIN reviews r ON d.id = r.driver_id
      WHERE d.id = $1
      GROUP BY d.id, d.full_name, d.license_plate
    `, [driverId])

    client.release()

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0] as DriverAnalytics
  } catch (error) {
    console.error('Error getting driver analytics:', error)
    throw error
  }
}

// Search drivers
export async function searchDrivers(query: string): Promise<DriverAnalytics[]> {
  if (!isDatabaseAvailable()) {
    throw new Error('Database not configured. Please set POSTGRES_URL environment variable.');
  }

  try {
    console.log('Attempting to connect to database for search...')
    const client = await pool.connect()
    console.log('Database connection successful for search')
    
    const result = await client.query(`
      SELECT 
        d.id,
        d.full_name,
        d.license_plate,
        COUNT(r.id) as total_reviews,
        ROUND(AVG(r.overall_rating), 1) as avg_overall,
        ROUND(AVG(r.pleasantness_rating), 1) as avg_pleasantness,
        ROUND((COUNT(CASE WHEN r.ride_speed_satisfied THEN 1 END) * 100.0 / COUNT(*)), 1) as ride_speed_satisfied_percentage,
        ROUND((COUNT(CASE WHEN r.was_on_time THEN 1 END) * 100.0 / COUNT(*)), 1) as on_time_percentage,
        ROUND((COUNT(CASE WHEN r.price_fair THEN 1 END) * 100.0 / COUNT(*)), 1) as price_fair_percentage,
        ROUND(AVG(r.waiting_time_minutes) FILTER (WHERE r.was_on_time = false), 1) as avg_waiting_time,
        ARRAY_AGG(DISTINCT r.ride_city) FILTER (WHERE r.ride_city IS NOT NULL) as service_cities
      FROM drivers d
      LEFT JOIN reviews r ON d.id = r.driver_id
      WHERE d.full_name ILIKE $1 OR d.license_plate ILIKE $1
      GROUP BY d.id, d.full_name, d.license_plate
      ORDER BY avg_overall DESC NULLS LAST, total_reviews DESC
    `, [`%${query}%`])

    client.release()
    console.log(`Search completed successfully, found ${result.rows.length} results`)
    return result.rows as DriverAnalytics[]
  } catch (error) {
    console.error('Error searching drivers:', error)
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        code: (error as any).code,
        detail: (error as any).detail,
        hint: (error as any).hint
      })
    }
    throw error
  }
}

// Get driver by ID
export async function getDriverById(id: string): Promise<Driver | null> {
  if (!isDatabaseAvailable()) {
    throw new Error('Database not configured. Please set POSTGRES_URL environment variable.');
  }

  try {
    const client = await pool.connect()
    const result = await client.query('SELECT * FROM drivers WHERE id = $1', [id])
    client.release()

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0] as Driver
  } catch (error) {
    console.error('Error getting driver:', error)
    throw error
  }
}

// Get reviews for a driver
export async function getDriverReviews(driverId: string): Promise<Review[]> {
  if (!isDatabaseAvailable()) {
    throw new Error('Database not configured. Please set POSTGRES_URL environment variable.');
  }

  try {
    const client = await pool.connect()
    const result = await client.query(
      'SELECT * FROM reviews WHERE driver_id = $1 ORDER BY created_at DESC',
      [driverId]
    )
    client.release()

    return result.rows as Review[]
  } catch (error) {
    console.error('Error getting driver reviews:', error)
    throw error
  }
}

// Create or find driver
export async function createOrFindDriver(fullName: string, licensePlate: string): Promise<Driver> {
  if (!isDatabaseAvailable()) {
    throw new Error('Database not configured. Please set POSTGRES_URL environment variable.');
  }

  try {
    const client = await pool.connect()
    
    // First try to find existing driver
    let result = await client.query('SELECT * FROM drivers WHERE license_plate = $1', [licensePlate])

    if (result.rows.length > 0) {
      client.release()
      return result.rows[0] as Driver
    }

    // Create new driver
    result = await client.query(
      'INSERT INTO drivers (full_name, license_plate) VALUES ($1, $2) RETURNING *',
      [fullName, licensePlate]
    )

    client.release()
    return result.rows[0] as Driver
  } catch (error) {
    console.error('Error creating/finding driver:', error)
    throw error
  }
}

// Create review
export async function createReview(reviewData: Omit<Review, 'id' | 'created_at'>): Promise<Review> {
  if (!isDatabaseAvailable()) {
    throw new Error('Database not configured. Please set POSTGRES_URL environment variable.');
  }

  try {
    const client = await pool.connect()
    const result = await client.query(`
      INSERT INTO reviews (
        driver_id, overall_rating, pleasantness_rating, ride_speed_satisfied,
        was_on_time, waiting_time_minutes, price_fair,
        comment, ride_city, ride_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      reviewData.driver_id,
      reviewData.overall_rating,
      reviewData.pleasantness_rating,
      reviewData.ride_speed_satisfied,
      reviewData.was_on_time,
      reviewData.waiting_time_minutes,
      reviewData.price_fair,
      reviewData.comment,
      reviewData.ride_city,
      reviewData.ride_date
    ])

    client.release()
    return result.rows[0] as Review
  } catch (error) {
    console.error('Error creating review:', error)
    throw error
  }
}
