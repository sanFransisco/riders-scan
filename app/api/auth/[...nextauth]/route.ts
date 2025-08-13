import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { pool } from '@/lib/supabase-db'
import { ensureDatabaseInitialized } from '@/lib/startup'
import { serverAuthOptions } from '@/lib/auth-config'

// Initialize database on startup
ensureDatabaseInitialized()

const authOptions = {
  ...serverAuthOptions,
  session: {
    strategy: 'jwt' as const,
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
