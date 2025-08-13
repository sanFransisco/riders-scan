'use client'

import { useSession, signIn, signOut } from 'next-auth/react'

export default function SignInButton() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <button className="px-4 py-2 text-sm text-gray-500 bg-gray-100 rounded-md">
        Loading...
      </button>
    )
  }

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {session.user?.name || session.user?.email}
        </span>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn('google')}
      className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"
    >
      Sign In
    </button>
  )
}
