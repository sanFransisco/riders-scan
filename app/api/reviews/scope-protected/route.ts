import { NextRequest, NextResponse } from 'next/server'
import { requireScope, requireAnyScope, getCurrentUser } from '@/lib/auth-middleware'

// Example: API route that requires 'create:reviews' scope
export async function POST(request: NextRequest) {
  // Check if user has required scope
  const authCheck = await requireScope('create:reviews')(request)
  if (authCheck instanceof NextResponse) {
    return authCheck // Returns error response if auth fails
  }

  // User is authenticated and has required scope
  const user = await getCurrentUser()
  
  try {
    const body = await request.json()
    
    // Your API logic here
    return NextResponse.json({
      success: true,
      message: 'Review created successfully',
      user: user?.email
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    )
  }
}

// Example: API route that requires ANY of multiple scopes
export async function GET(request: NextRequest) {
  // Check if user has any of these scopes
  const authCheck = await requireAnyScope(['read:reviews', 'read:users'])(request)
  if (authCheck instanceof NextResponse) {
    return authCheck
  }

  const user = await getCurrentUser()
  
  return NextResponse.json({
    success: true,
    message: 'Data retrieved successfully',
    user: user?.email
  })
}
