'use client'

import { useSession, signIn, signOut } from 'next-auth/react'

export default function SignInButton() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <button className="px-3 py-1.5 text-sm text-gray-400 bg-transparent border border-gray-600 rounded-md">
        Loading...
      </button>
    )
  }

  if (session) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-300">
          {session.user?.name || session.user?.email}
        </span>
        <button
          onClick={() => signOut()}
          className="px-3 py-1.5 text-sm text-gray-300 bg-transparent border border-gray-600 hover:bg-gray-800 hover:border-gray-500 rounded-md transition-colors"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn('google')}
      className="px-3 py-1.5 text-sm text-gray-300 bg-transparent border border-gray-600 hover:bg-gray-800 hover:border-gray-500 rounded-md transition-colors"
    >
      Sign In
    </button>
  )
}
