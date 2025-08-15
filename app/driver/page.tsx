import { getServerSession } from 'next-auth'
import { serverAuthOptions } from '@/lib/auth-config'
import DriverClient from './Client'
import { redirect } from 'next/navigation'

export default async function DriverPage() {
  const session: any = await getServerSession(serverAuthOptions as any)
  const roles: string[] = (session?.user && (session.user as any).roles) ? (session.user as any).roles : []
  if (!session) redirect('/auth/signin')
  if (!roles.includes('driver')) redirect('/auth/onboarding')
  return <DriverClient />
}
