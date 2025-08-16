"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [saving, setSaving] = useState(false)
  const [license, setLicense] = useState('')

  // If the user already has a role, send them away immediately
  useEffect(() => {
    if (status === 'loading') return
    const roles: string[] = (session?.user as any)?.roles || []
    const forceLicense = searchParams?.get('needLicense') === '1'
    if (!session) {
      router.replace('/auth/signin')
    } else if (roles.includes('driver') && !forceLicense) {
      router.replace('/driver')
    } else if (roles.includes('rider')) {
      router.replace('/')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status])

  const choose = async (role: 'rider' | 'driver') => {
    if (role === 'driver') {
      if (!/^\d{7}$/.test(license)) {
        alert('Enter 7-digit license number to proceed')
        return
      }
    }
    setSaving(true)
    const res = await fetch('/api/auth/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    setSaving(false)
    if (res.ok) {
      if (role === 'driver') {
        try {
          await fetch('/api/driver/onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ license_plate: license }),
          })
        } catch {}
      }
      // Force session refresh and hard redirect so server-side gating sees updated roles
      try { await fetch('/api/auth/session?update=1', { cache: 'no-store' }) } catch {}
      window.location.href = role === 'driver' ? '/driver' : '/'
    } else {
      alert('Failed to save role')
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border rounded-lg p-6 space-y-6 text-center">
        <h1 className="text-2xl font-bold">Choose your role</h1>
        <p className="text-gray-600">You can change this later in settings.</p>
        <div className="space-y-4">
          <div className="flex items-center gap-2 justify-center">
            <input
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              placeholder="7-digit license number (required for drivers)"
              maxLength={7}
              pattern="^\\\d{7}$"
              className="px-3 py-2 border rounded-md w-64"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            disabled={saving}
            onClick={() => choose('rider')}
            className="px-6 py-3 rounded-full border border-gray-300 bg-white hover:bg-gray-50"
          >
            I am a Rider
          </button>
          <button
            disabled={saving}
            onClick={() => choose('driver')}
            className="px-6 py-3 rounded-full border border-gray-300 bg-white hover:bg-gray-50"
          >
            I am a Driver
          </button>
          </div>
        </div>
      </div>
    </div>
  )
}
