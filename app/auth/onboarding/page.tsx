"use client"

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function OnboardingPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const choose = async (role: 'rider' | 'driver') => {
    setSaving(true)
    const res = await fetch('/api/auth/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    setSaving(false)
    if (res.ok) {
      router.push(role === 'driver' ? '/driver' : '/')
    } else {
      alert('Failed to save role')
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border rounded-lg p-6 space-y-6 text-center">
        <h1 className="text-2xl font-bold">Choose your role</h1>
        <p className="text-gray-600">You can change this later in settings.</p>
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
  )
}
