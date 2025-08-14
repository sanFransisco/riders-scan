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
  review_text?: string;
  ride_city?: string;
  service?: string;
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
  total_waiting_time?: number;
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
    
    // Complete database setup with role-based scopes
    const setupQueries = [
      // 0. Create schema version table
      `CREATE TABLE IF NOT EXISTS schema_version (
        id INTEGER PRIMARY KEY DEFAULT 1,
        version INTEGER NOT NULL DEFAULT 1,
        updated_at TIMESTAMP DEFAULT NOW()
      )`,
      
      // 1. Create users table first (no dependencies)
      `CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        role TEXT[] DEFAULT ARRAY['user'],
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,
      
      // 2. Create role_scopes table (no dependencies)
      `CREATE TABLE IF NOT EXISTS role_scopes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role_name TEXT UNIQUE NOT NULL,
        scopes TEXT[] NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      
      // 3. Create drivers table (no dependencies)
      `CREATE TABLE IF NOT EXISTS drivers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name TEXT NOT NULL,
        license_plate TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,
      
      // 4. Create reviews table with all required columns and foreign keys (if not exists)
      `CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
        pleasantness_rating INTEGER CHECK (pleasantness_rating IS NULL OR (pleasantness_rating >= 1 AND pleasantness_rating <= 5)),
        ride_speed_satisfied BOOLEAN,
        was_on_time BOOLEAN,
        waiting_time_minutes INTEGER,
        price_fair BOOLEAN,
        ride_city TEXT,
        review_text TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,
      
      // 5. Insert default role scopes
      `INSERT INTO role_scopes (role_name, scopes, description) VALUES
        ('user', ARRAY['read:reviews', 'create:reviews', 'update:own_reviews', 'delete:own_reviews'], 'Regular user permissions'),
        ('moderator', ARRAY['read:reviews', 'create:reviews', 'update:own_reviews', 'delete:own_reviews', 'delete:any_reviews', 'read:users'], 'Content moderator permissions'),
        ('admin', ARRAY['read:reviews', 'create:reviews', 'update:own_reviews', 'delete:own_reviews', 'delete:any_reviews', 'read:users', 'update:users', 'delete:users', 'manage:roles'], 'Full administrator permissions')
      ON CONFLICT (role_name) DO UPDATE SET
        scopes = EXCLUDED.scopes,
        description = EXCLUDED.description`,
      
      // 7. Create indexes for better performance
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
      `CREATE INDEX IF NOT EXISTS idx_drivers_license_plate ON drivers(license_plate)`,
      `CREATE INDEX IF NOT EXISTS idx_reviews_driver_id ON reviews(driver_id)`,
      `CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id)`,
      
      // 8. Insert yourself as admin (replace with your email)
      `INSERT INTO users (email, name, role) 
       VALUES ('yalibar1121@gmail.com', 'Yali', ARRAY['user', 'admin'])
       ON CONFLICT (email) 
       DO UPDATE SET 
         role = ARRAY['user', 'admin'],
         updated_at = NOW()`,
      
      // 9. Create a function to update updated_at timestamp
      `CREATE OR REPLACE FUNCTION update_updated_at_column()
       RETURNS TRIGGER AS $$
       BEGIN
           NEW.updated_at = NOW();
           RETURN NEW;
       END;
       $$ language 'plpgsql'`,
      
      // 10. Create triggers to automatically update updated_at
      `DROP TRIGGER IF EXISTS update_users_updated_at ON users`,
      `CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
           FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
      
      `DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers`,
      `CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
           FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
      
      `DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews`,
      `CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
           FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
      
      // 11. Create function to check if user has scope
      `CREATE OR REPLACE FUNCTION user_has_scope(user_id UUID, required_scope TEXT)
       RETURNS BOOLEAN AS $$
       BEGIN
         RETURN EXISTS (
           SELECT 1 
           FROM users u
           JOIN role_scopes rs ON rs.role_name = ANY(u.role::TEXT[])
           WHERE u.id = user_id 
           AND required_scope = ANY(rs.scopes)
         );
       END;
       $$ LANGUAGE plpgsql SECURITY DEFINER`,
      
      // 12. Enable Row Level Security (RLS)
      `ALTER TABLE users ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE drivers ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE reviews ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE role_scopes ENABLE ROW LEVEL SECURITY`,
      
      // 13. Drop existing policies if they exist
      `DROP POLICY IF EXISTS "Users can read own data" ON users`,
      `DROP POLICY IF EXISTS "Users can update own data" ON users`,
      `DROP POLICY IF EXISTS "Anyone can read drivers" ON drivers`,
      `DROP POLICY IF EXISTS "Anyone can read reviews" ON reviews`,
      `DROP POLICY IF EXISTS "Authenticated users can create reviews" ON reviews`,
      `DROP POLICY IF EXISTS "Users can manage own reviews" ON reviews`,
      `DROP POLICY IF EXISTS "Admins can manage all users" ON users`,
      `DROP POLICY IF EXISTS "Admins can manage all drivers" ON drivers`,
      `DROP POLICY IF EXISTS "Admins can manage all reviews" ON reviews`,
      `DROP POLICY IF EXISTS "Only admins can manage role scopes" ON role_scopes`,
      
      // 14. Create RLS policies
      `CREATE POLICY "Users can read own data" ON users
           FOR SELECT USING (auth.uid()::text = id::text)`,
      
      `CREATE POLICY "Users can update own data" ON users
           FOR UPDATE USING (auth.uid()::text = id::text)`,
      
      `CREATE POLICY "Anyone can read drivers" ON drivers
           FOR SELECT USING (true)`,
      
      `CREATE POLICY "Anyone can read reviews" ON reviews
           FOR SELECT USING (true)`,
      
      `CREATE POLICY "Authenticated users can create reviews" ON reviews
           FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)`,
      
      `CREATE POLICY "Users can manage own reviews" ON reviews
           FOR ALL USING (auth.uid()::text = user_id::text)`,
      
      `CREATE POLICY "Admins can manage all users" ON users
           FOR ALL USING (
               EXISTS (
                   SELECT 1 FROM users 
                   WHERE id = auth.uid()::uuid 
                   AND 'admin' = ANY(role::TEXT[])
               )
           )`,
      
      `CREATE POLICY "Admins can manage all drivers" ON drivers
           FOR ALL USING (
               EXISTS (
                   SELECT 1 FROM users 
                   WHERE id = auth.uid()::uuid 
                   AND 'admin' = ANY(role::TEXT[])
               )
           )`,
      
      `CREATE POLICY "Admins can manage all reviews" ON reviews
           FOR ALL USING (
               EXISTS (
                   SELECT 1 FROM users 
                   WHERE id = auth.uid()::uuid 
                   AND 'admin' = ANY(role::TEXT[])
               )
           )`,
      
      `CREATE POLICY "Only admins can manage role scopes" ON role_scopes
           FOR ALL USING (
               EXISTS (
                   SELECT 1 FROM users 
                   WHERE id = auth.uid()::uuid 
                   AND 'admin' = ANY(role::TEXT[])
               )
           )`,
      
      // 15. Grant necessary permissions
      `GRANT ALL ON users TO authenticated`,
      `GRANT ALL ON drivers TO authenticated`,
      `GRANT ALL ON reviews TO authenticated`,
      `GRANT ALL ON role_scopes TO authenticated`,
      `GRANT EXECUTE ON FUNCTION user_has_scope(UUID, TEXT) TO authenticated`,
      `GRANT USAGE ON SCHEMA public TO authenticated`
    ]

    // Execute all setup queries
    for (const query of setupQueries) {
      await client.query(query)
    }

    // Check current schema version
    const versionResult = await client.query('SELECT version FROM schema_version WHERE id = 1')
    const currentVersion = versionResult.rows.length > 0 ? versionResult.rows[0].version : 0
    
    console.log(`Current schema version: ${currentVersion}`)
    
    // Apply migrations if needed
    if (currentVersion < 1) {
      // Version 1: Initial setup (already done above)
      await client.query('INSERT INTO schema_version (id, version) VALUES (1, 1) ON CONFLICT (id) DO UPDATE SET version = 1, updated_at = NOW()')
      console.log('✅ Applied migration to version 1')
    }
    
    if (currentVersion < 2) {
      // Version 2: Fix pleasantness_rating constraint
      await client.query(`
        DO $$ 
        BEGIN
          -- Drop old constraint if exists
          ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_pleasantness_rating_check;
          -- Add new constraint
          ALTER TABLE reviews ADD CONSTRAINT reviews_pleasantness_rating_check 
            CHECK (pleasantness_rating IS NULL OR (pleasantness_rating >= 1 AND pleasantness_rating <= 5));
        END $$;
      `)
      await client.query('UPDATE schema_version SET version = 2, updated_at = NOW() WHERE id = 1')
      console.log('✅ Applied migration to version 2')
    }
    
    if (currentVersion < 3) {
      // Version 3: Add service field for ride booking platform
      await client.query(`
        DO $$ 
        BEGIN
          -- Add service column if it doesn't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'service') THEN
            ALTER TABLE reviews ADD COLUMN service TEXT CHECK (service IN ('Yango', 'Gett', 'Uber', 'Other'));
          END IF;
        END $$;
      `)
      await client.query('UPDATE schema_version SET version = 3, updated_at = NOW() WHERE id = 1')
      console.log('✅ Applied migration to version 3')
    }

    client.release()
    console.log('🎉 Database setup completed successfully! You are now an admin with role-based scopes.')
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
        SUM(r.waiting_time_minutes) FILTER (WHERE r.was_on_time = false) as total_waiting_time,
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
        SUM(r.waiting_time_minutes) FILTER (WHERE r.was_on_time = false) as total_waiting_time,
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

// Delete review by ID
export async function deleteReview(reviewId: string): Promise<boolean> {
  if (!isDatabaseAvailable()) {
    throw new Error('Database not configured. Please set POSTGRES_URL environment variable.');
  }

  try {
    const client = await pool.connect()
    
    const result = await client.query(
      'DELETE FROM reviews WHERE id = $1 RETURNING id',
      [reviewId]
    )

    client.release()
    
    if (result.rows.length > 0) {
      console.log(`Review ${reviewId} deleted successfully`)
      return true
    } else {
      console.log(`Review ${reviewId} not found`)
      return false
    }
  } catch (error) {
    console.error('Error deleting review:', error)
    throw error
  }
}

// Get review by ID
export async function getReviewById(reviewId: string): Promise<Review | null> {
  if (!isDatabaseAvailable()) {
    throw new Error('Database not configured. Please set POSTGRES_URL environment variable.');
  }

  try {
    const client = await pool.connect()
    
    const result = await client.query(
      'SELECT * FROM reviews WHERE id = $1',
      [reviewId]
    )

    client.release()
    
    if (result.rows.length > 0) {
      return result.rows[0] as Review
    } else {
      return null
    }
  } catch (error) {
    console.error('Error getting review:', error)
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
        review_text, ride_city, service, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      reviewData.driver_id,
      reviewData.overall_rating,
      reviewData.pleasantness_rating,
      reviewData.ride_speed_satisfied,
      reviewData.was_on_time,
      reviewData.waiting_time_minutes,
      reviewData.price_fair,
      reviewData.review_text,
      reviewData.ride_city,
      reviewData.service,
      new Date()
    ])

    client.release()
    return result.rows[0] as Review
  } catch (error) {
    console.error('Error creating review:', error)
    throw error
  }
}
