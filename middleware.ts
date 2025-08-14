import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Initialize database on first request
  if (pathname === '/') {
    try {
      await fetch(`${request.nextUrl.origin}/api/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } catch (error) {
      console.error('Failed to initialize database:', error)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/']
}
