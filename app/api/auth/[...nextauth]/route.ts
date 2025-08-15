import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { pool } from '@/lib/supabase-db'
import { serverAuthOptions } from '@/lib/auth-config'

// Avoid initializing database on auth cold start to prevent timeouts on Vercel

const authOptions = {
  ...serverAuthOptions,
  session: {
    strategy: 'jwt' as const,
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
