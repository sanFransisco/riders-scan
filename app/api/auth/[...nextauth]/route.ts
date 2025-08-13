import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { pool } from '@/lib/supabase-db'
import { ensureDatabaseInitialized } from '@/lib/startup'

// Initialize database on startup
ensureDatabaseInitialized()

// Separate config for getServerSession (without session strategy)
export const serverAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }: { user: any; account: any; profile?: any }) {
      if (account?.provider === 'google') {
        try {
          // Store or update user in database
          const client = await pool.connect()
          
          // Check if user exists
          const existingUser = await client.query(
            'SELECT * FROM users WHERE email = $1',
            [user.email]
          )

          if (existingUser.rows.length === 0) {
            // Create new user
            await client.query(
              'INSERT INTO users (email, name, role) VALUES ($1, $2, ARRAY[$3])',
              [user.email, user.name, 'user']
            )
          } else {
            // Update existing user
            await client.query(
              'UPDATE users SET name = $1, updated_at = NOW() WHERE email = $2',
              [user.name, user.email]
            )
          }

          client.release()
        } catch (error) {
          console.error('Error handling user sign in:', error)
        }
      }
      return true
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user?.email) {
        try {
          // Get user data from database
          const client = await pool.connect()
          const userResult = await client.query(
            'SELECT id, email, name, role FROM users WHERE email = $1',
            [session.user.email]
          )
          client.release()

          if (userResult.rows.length > 0) {
            const userData = userResult.rows[0]
            session.user.id = userData.id
            // Handle role as array - check if user has admin role
            const roles = userData.role || ['user']
            session.user.role = roles.includes('admin') ? 'admin' : 'user'
          }
        } catch (error) {
          console.error('Error getting user session data:', error)
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }: { user: any; account: any; profile?: any }) {
      if (account?.provider === 'google') {
        try {
          // Store or update user in database
          const client = await pool.connect()
          
          // Check if user exists
          const existingUser = await client.query(
            'SELECT * FROM users WHERE email = $1',
            [user.email]
          )

          if (existingUser.rows.length === 0) {
            // Create new user
            await client.query(
              'INSERT INTO users (email, name, role) VALUES ($1, $2, ARRAY[$3])',
              [user.email, user.name, 'user']
            )
          } else {
            // Update existing user
            await client.query(
              'UPDATE users SET name = $1, updated_at = NOW() WHERE email = $2',
              [user.name, user.email]
            )
          }

          client.release()
        } catch (error) {
          console.error('Error handling user sign in:', error)
        }
      }
      return true
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user?.email) {
        try {
          // Get user data from database
          const client = await pool.connect()
          const userResult = await client.query(
            'SELECT id, email, name, role FROM users WHERE email = $1',
            [session.user.email]
          )
          client.release()

          if (userResult.rows.length > 0) {
            const userData = userResult.rows[0]
            session.user.id = userData.id
            // Handle role as array - check if user has admin role
            const roles = userData.role || ['user']
            session.user.role = roles.includes('admin') ? 'admin' : 'user'
          }
        } catch (error) {
          console.error('Error getting user session data:', error)
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt' as const,
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
