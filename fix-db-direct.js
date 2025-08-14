const { Pool } = require('pg');

// Create connection pool
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing production database...');
    
    // 1. Add service column to reviews table
    console.log('Adding service column to reviews table...');
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'service') THEN
          ALTER TABLE reviews ADD COLUMN service TEXT CHECK (service IN ('Yango', 'Gett', 'Uber', 'Other'));
          RAISE NOTICE 'Added service column to reviews table';
        ELSE
          RAISE NOTICE 'Service column already exists in reviews table';
        END IF;
      END $$;
    `);
    
    // 2. Update schema version to 3
    console.log('Updating schema version...');
    await client.query(`
      INSERT INTO schema_version (id, version) VALUES (1, 3) 
      ON CONFLICT (id) DO UPDATE SET version = 3, updated_at = NOW()
    `);
    
    // 3. Fix user roles
    console.log('Fixing user roles...');
    await client.query(`
      UPDATE users 
      SET role = ARRAY['user'] 
      WHERE role IS NULL OR role = '{}' OR role = ARRAY['']
    `);
    
    // 4. Ensure admin user has correct role
    console.log('Setting admin role...');
    await client.query(`
      UPDATE users 
      SET role = ARRAY['admin'] 
      WHERE email = 'yalibar1121@gmail.com'
    `);
    
    // 5. Verify fixes
    console.log('Verifying fixes...');
    
    const reviewsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'reviews' 
      ORDER BY ordinal_position
    `);
    console.log('Reviews table columns:', reviewsColumns.rows);
    
    const schemaVersion = await client.query('SELECT version FROM schema_version WHERE id = 1');
    console.log('Schema version:', schemaVersion.rows[0]);
    
    const users = await client.query('SELECT email, role FROM users LIMIT 5');
    console.log('User roles:', users.rows);
    
    console.log('✅ Database fixes completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixDatabase().catch(console.error);
