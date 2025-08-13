import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This runs on every request, but we'll use it to trigger DB init
export function middleware(request: NextRequest) {
  // Only run on the first request to trigger DB initialization
  if (request.nextUrl.pathname === '/') {
    // Trigger DB init in the background
    fetch(`${request.nextUrl.origin}/api/init`, { method: 'POST' }).catch(console.error)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
