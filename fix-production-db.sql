-- Fix production database issues
-- 1. Add service column to reviews table
-- 2. Fix role handling in users table

-- Add service column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'service') THEN
    ALTER TABLE reviews ADD COLUMN service TEXT CHECK (service IN ('Yango', 'Gett', 'Uber', 'Other'));
    RAISE NOTICE 'Added service column to reviews table';
  ELSE
    RAISE NOTICE 'Service column already exists in reviews table';
  END IF;
END $$;

-- Update schema version to 3
INSERT INTO schema_version (id, version) VALUES (1, 3) 
ON CONFLICT (id) DO UPDATE SET version = 3, updated_at = NOW();

-- Fix any existing users with incorrect role format
UPDATE users 
SET role = ARRAY['user'] 
WHERE role IS NULL OR role = '{}' OR role = ARRAY[''];

-- Ensure admin user has correct role format
UPDATE users 
SET role = ARRAY['admin'] 
WHERE email = 'yalibar1121@gmail.com';

-- Verify the fixes
SELECT 'Reviews table columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'reviews' 
ORDER BY ordinal_position;

SELECT 'Schema version:' as info;
SELECT version FROM schema_version WHERE id = 1;

SELECT 'User roles:' as info;
SELECT email, role FROM users LIMIT 5;
