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

  // Handle authentication routing
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  
  // If user is not authenticated and trying to access home page, redirect to landing
  if (!token && pathname === '/') {
    return NextResponse.redirect(new URL('/landing', request.url))
  }

  // If user is authenticated and trying to access landing page, redirect to home
  if (token && pathname === '/landing') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/landing']
}
