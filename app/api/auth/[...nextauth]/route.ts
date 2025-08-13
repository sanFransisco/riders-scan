import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { pool } from '@/lib/supabase-db'

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
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
              'INSERT INTO users (email, name, image, provider) VALUES ($1, $2, $3, $4)',
              [user.email, user.name, user.image, 'google']
            )
          } else {
            // Update existing user
            await client.query(
              'UPDATE users SET name = $1, image = $2, updated_at = NOW() WHERE email = $3',
              [user.name, user.image, user.email]
            )
          }

          client.release()
        } catch (error) {
          console.error('Error handling user sign in:', error)
        }
      }
      return true
    },
    async session({ session, token }) {
      if (session.user?.email) {
        try {
          // Get user data from database
          const client = await pool.connect()
          const userResult = await client.query(
            'SELECT id, email, name, image, role FROM users WHERE email = $1',
            [session.user.email]
          )
          client.release()

          if (userResult.rows.length > 0) {
            const userData = userResult.rows[0]
            session.user.id = userData.id
            session.user.role = userData.role || 'user'
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
    strategy: 'jwt',
  },
})

export { handler as GET, handler as POST }
