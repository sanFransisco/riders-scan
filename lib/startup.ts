import { initDatabase } from './supabase-db'

// This will run when the serverless function initializes
let isInitialized = false

export async function ensureDatabaseInitialized() {
  if (isInitialized) {
    return
  }

  try {
    console.log('🔄 Initializing database on startup...')
    await initDatabase()
    console.log('✅ Database initialized successfully on startup')
    isInitialized = true
  } catch (error) {
    console.error('❌ Failed to initialize database on startup:', error)
    // Don't throw - let the app continue even if DB init fails
  }
}

// Call this in your API routes to ensure DB is initialized
export function withDatabaseInit<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    await ensureDatabaseInitialized()
    return fn(...args)
  }
}
