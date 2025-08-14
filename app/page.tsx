import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { serverAuthOptions } from '@/lib/auth-config'
import HomePageClient from './HomePageClient'

export default async function HomePage() {
  const session = await getServerSession(serverAuthOptions)
  
  if (!session) {
    redirect('/landing')
  }

  return <HomePageClient />
}
