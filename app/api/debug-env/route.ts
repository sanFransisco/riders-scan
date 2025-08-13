import { NextResponse } from 'next/server'

export async function GET() {
  const envVars = {
    POSTGRES_URL: process.env.POSTGRES_URL ? 'SET' : 'NOT SET',
    POSTGRES_USER: process.env.POSTGRES_USER ? 'SET' : 'NOT SET',
    POSTGRES_HOST: process.env.POSTGRES_HOST ? 'SET' : 'NOT SET',
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ? 'SET' : 'NOT SET',
    POSTGRES_DATABASE: process.env.POSTGRES_DATABASE ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  }

  return NextResponse.json(envVars)
}
