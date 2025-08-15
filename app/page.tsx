import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { serverAuthOptions } from '@/lib/auth-config'
import HomePageClient from './HomePageClient'

export default async function HomePage() {
  const session = await getServerSession(serverAuthOptions)
  
  if (!session) {
    redirect('/landing')
  }

  // If user has no role yet, send to onboarding
  const roles: string[] = Array.isArray((session?.user as any)?.roles)
    ? ((session?.user as any)?.roles as string[])
    : []
  if (roles.length === 0) {
    redirect('/auth/onboarding')
  }

  return <HomePageClient />
}
