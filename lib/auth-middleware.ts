import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { pool } from '@/lib/supabase-db'

// Define scope types
export type Scope = 
  | 'read:reviews'
  | 'create:reviews'
  | 'update:own_reviews'
  | 'delete:own_reviews'
  | 'delete:any_reviews'
  | 'read:users'
  | 'update:users'
  | 'delete:users'
  | 'manage:roles'

// Check if user has specific scope
export async function userHasScope(userId: string, scope: Scope): Promise<boolean> {
  try {
    const client = await pool.connect()
    const result = await client.query(
      'SELECT user_has_scope($1, $2) as has_scope',
      [userId, scope]
    )
    client.release()
    return result.rows[0]?.has_scope || false
  } catch (error) {
    console.error('Error checking user scope:', error)
    return false
  }
}

// Get all scopes for a user
export async function getUserScopes(userId: string): Promise<Scope[]> {
  try {
    const client = await pool.connect()
    const result = await client.query(`
      SELECT DISTINCT unnest(rs.scopes) as scope
      FROM users u
      JOIN role_scopes rs ON rs.role_name = ANY(u.role)
      WHERE u.id = $1
    `, [userId])
    client.release()
    return result.rows.map(row => row.scope as Scope)
  } catch (error) {
    console.error('Error getting user scopes:', error)
    return []
  }
}

// Middleware for API route protection
export function requireScope(scope: Scope) {
  return async (request: NextRequest) => {
    try {
      // Get session from NextAuth
      const session = await getServerSession()
      
      if (!session || !session.user?.id) {
        return NextResponse.json(
          { error: 'Authentication required' }, 
          { status: 401 }
        )
      }

      // Check if user has required scope
      const hasScope = await userHasScope(session.user.id, scope)
      
      if (!hasScope) {
        return NextResponse.json(
          { error: 'Insufficient permissions' }, 
          { status: 403 }
        )
      }

      // Add user info to request for downstream handlers
      const requestWithUser = request.clone()
      ;(requestWithUser as any).user = session.user
      
      return NextResponse.next()
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' }, 
        { status: 500 }
      )
    }
  }
}

// Middleware for multiple scopes (user needs ANY of the scopes)
export function requireAnyScope(scopes: Scope[]) {
  return async (request: NextRequest) => {
    try {
      const session = await getServerSession()
      
      if (!session || !session.user?.id) {
        return NextResponse.json(
          { error: 'Authentication required' }, 
          { status: 401 }
        )
      }

      // Check if user has any of the required scopes
      const userScopes = await getUserScopes(session.user.id)
      const hasAnyScope = scopes.some(scope => userScopes.includes(scope))
      
      if (!hasAnyScope) {
        return NextResponse.json(
          { error: 'Insufficient permissions' }, 
          { status: 403 }
        )
      }

      return NextResponse.next()
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' }, 
        { status: 500 }
      )
    }
  }
}

// Middleware for all scopes (user needs ALL of the scopes)
export function requireAllScopes(scopes: Scope[]) {
  return async (request: NextRequest) => {
    try {
      const session = await getServerSession()
      
      if (!session || !session.user?.id) {
        return NextResponse.json(
          { error: 'Authentication required' }, 
          { status: 401 }
        )
      }

      // Check if user has all required scopes
      const userScopes = await getUserScopes(session.user.id)
      const hasAllScopes = scopes.every(scope => userScopes.includes(scope))
      
      if (!hasAllScopes) {
        return NextResponse.json(
          { error: 'Insufficient permissions' }, 
          { status: 403 }
        )
      }

      return NextResponse.next()
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error' }, 
        { status: 500 }
      )
    }
  }
}

// Helper to get current user from session
export async function getCurrentUser() {
  const session = await getServerSession()
  return session?.user || null
}
