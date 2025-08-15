"use client"

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function RiderPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [matchId, setMatchId] = useState<string | null>(null)
  const [rideStatus, setRideStatus] = useState<string>('idle')
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const [autoAcceptIn, setAutoAcceptIn] = useState<number | null>(null)

  const requestRide = async () => {
    if (!navigator.geolocation) return alert('Geolocation not supported')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const body = {
          pickup: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          dropoff: null,
          service: null,
        }
        const res = await fetch('/api/match/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (data.ok && data.matchId) {
          setMatchId(data.matchId)
          setRideStatus('matching')
          startPolling(data.matchId)
        } else {
          alert(data.message || 'No drivers nearby')
        }
      },
      async (err) => {
        console.error('Geolocation error', err)
        alert('Location required to request a ride. Please enable GPS and try again.')
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    )
  }

  const startPolling = (id: string) => {
    if (pollTimer.current) clearInterval(pollTimer.current)
    pollTimer.current = setInterval(async () => {
      const res = await fetch(`/api/rides/${id}`)
      if (!res.ok) return
      const { ride } = await res.json()
      if (ride?.driver_accepted_at && !ride?.rider_consented_at) {
        setRideStatus('consent')
        if (autoAcceptIn == null) {
          let seconds = 10
          setAutoAcceptIn(seconds)
          const t: ReturnType<typeof setInterval> = setInterval(() => {
            seconds -= 1
            setAutoAcceptIn(seconds)
            if (seconds <= 0) {
              clearInterval(t)
              approveRide(id)
            }
          }, 1000)
        }
      } else if (ride?.status === 'ontrip') {
        setRideStatus('ontrip')
      }
    }, 2000)
  }

  const approveRide = async (id: string) => {
    await fetch(`/api/match/${id}/approve`, { method: 'POST' })
    setRideStatus('enroute')
  }

  const declineRide = async (id: string) => {
    await fetch(`/api/match/${id}/decline`, { method: 'POST' })
    setRideStatus('idle')
    setMatchId(null)
    if (pollTimer.current) clearInterval(pollTimer.current)
  }

  useEffect(() => {
    if (status === 'loading') return
    const roles: string[] = (session?.user as any)?.roles || []
    if (!session) router.push('/auth/signin')
    else if (!roles.includes('rider')) router.push('/auth/onboarding')
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status])

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Rider Console (MVP)</h1>

      {rideStatus === 'idle' && (
        <button
          onClick={requestRide}
          className="px-4 py-2 rounded-full border border-gray-300 bg-white text-black hover:bg-gray-50"
        >
          Request Ride
        </button>
      )}

      {rideStatus === 'matching' && <p>Looking for a driver...</p>}

      {rideStatus === 'consent' && matchId && (
        <div className="bg-white border rounded-lg p-4">
          <p className="mb-3">Driver assigned. Start ride?</p>
          <div className="flex gap-2">
            <button
              onClick={() => approveRide(matchId)}
              className="px-4 py-2 rounded-full border border-gray-300 bg-white hover:bg-gray-50"
            >
              Start ride {autoAcceptIn != null ? `(${autoAcceptIn})` : ''}
            </button>
            <button
              onClick={() => declineRide(matchId)}
              className="px-4 py-2 rounded-full border border-gray-300 bg-white hover:bg-gray-50"
            >
              Decline & rematch
            </button>
          </div>
        </div>
      )}

      {rideStatus === 'enroute' && <p>Driver on the way…</p>}
      {rideStatus === 'ontrip' && <p>Ride in progress…</p>}
    </div>
  )
}
