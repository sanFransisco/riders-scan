-- Complete Database Setup for Riders Scan with Role Scopes
-- Run this in Supabase SQL Editor

-- 1. Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT[] DEFAULT ARRAY['user'],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create role_scopes table for defining what each role can do
CREATE TABLE IF NOT EXISTS role_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT UNIQUE NOT NULL,
  scopes TEXT[] NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create drivers table if it doesn't exist
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  license_plate TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  honesty_rating INTEGER CHECK (honesty_rating >= 1 AND honesty_rating <= 5),
  pleasantness_rating INTEGER CHECK (pleasantness_rating >= 1 AND pleasantness_rating <= 5),
  ride_speed_satisfied BOOLEAN,
  was_on_time BOOLEAN,
  waiting_time_minutes INTEGER,
  price_fair BOOLEAN,
  ride_city TEXT,
  review_text TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Insert default role scopes
INSERT INTO role_scopes (role_name, scopes, description) VALUES
  ('user', ARRAY['read:reviews', 'create:reviews', 'update:own_reviews', 'delete:own_reviews'], 'Regular user permissions'),
  ('moderator', ARRAY['read:reviews', 'create:reviews', 'update:own_reviews', 'delete:own_reviews', 'delete:any_reviews', 'read:users'], 'Content moderator permissions'),
  ('admin', ARRAY['read:reviews', 'create:reviews', 'update:own_reviews', 'delete:own_reviews', 'delete:any_reviews', 'read:users', 'update:users', 'delete:users', 'manage:roles'], 'Full administrator permissions')
ON CONFLICT (role_name) DO UPDATE SET
  scopes = EXCLUDED.scopes,
  description = EXCLUDED.description;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_drivers_license_plate ON drivers(license_plate);
CREATE INDEX IF NOT EXISTS idx_reviews_driver_id ON reviews(driver_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);

-- 7. Insert yourself as admin (replace with your email)
INSERT INTO users (email, name, role) 
VALUES ('yalib@jfrog.com', 'Yali', ARRAY['user', 'admin'])
ON CONFLICT (email) 
DO UPDATE SET 
  role = ARRAY['user', 'admin'],
  updated_at = NOW();

-- 8. Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Create function to check if user has scope
CREATE OR REPLACE FUNCTION user_has_scope(user_id UUID, required_scope TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM users u
    JOIN role_scopes rs ON rs.role_name = ANY(u.role)
    WHERE u.id = user_id 
    AND required_scope = ANY(rs.scopes)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_scopes ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies
-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Anyone can read drivers
CREATE POLICY "Anyone can read drivers" ON drivers
    FOR SELECT USING (true);

-- Anyone can read reviews
CREATE POLICY "Anyone can read reviews" ON reviews
    FOR SELECT USING (true);

-- Authenticated users can create reviews
CREATE POLICY "Authenticated users can create reviews" ON reviews
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update/delete their own reviews
CREATE POLICY "Users can manage own reviews" ON reviews
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Admins can manage all data
CREATE POLICY "Admins can manage all users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::uuid 
            AND 'admin' = ANY(role)
        )
    );

CREATE POLICY "Admins can manage all drivers" ON drivers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::uuid 
            AND 'admin' = ANY(role)
        )
    );

CREATE POLICY "Admins can manage all reviews" ON reviews
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::uuid 
            AND 'admin' = ANY(role)
        )
    );

-- Only admins can manage role scopes
CREATE POLICY "Only admins can manage role scopes" ON role_scopes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid()::uuid 
            AND 'admin' = ANY(role)
        )
    );

-- 13. Grant necessary permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON drivers TO authenticated;
GRANT ALL ON reviews TO authenticated;
GRANT ALL ON role_scopes TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_scope(UUID, TEXT) TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Success message
SELECT 'Database setup completed successfully! You are now an admin with role-based scopes.' as message;
