"use client"

import { useEffect, useRef, useState } from 'react'

export default function RiderPage() {
  const [matchId, setMatchId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('idle')
  const pollTimer = useRef<NodeJS.Timer | null>(null)
  const [autoAcceptIn, setAutoAcceptIn] = useState<number | null>(null)

  const requestRide = async () => {
    if (!navigator.geolocation) return alert('Geolocation not supported')
    navigator.geolocation.getCurrentPosition(async (pos) => {
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
        setStatus('matching')
        startPolling(data.matchId)
      } else {
        alert(data.message || 'No drivers nearby')
      }
    })
  }

  const startPolling = (id: string) => {
    if (pollTimer.current) clearInterval(pollTimer.current)
    pollTimer.current = setInterval(async () => {
      const res = await fetch(`/api/rides/${id}`)
      if (!res.ok) return
      const { ride } = await res.json()
      if (ride?.driver_accepted_at && !ride?.rider_consented_at) {
        setStatus('consent')
        if (autoAcceptIn == null) {
          let seconds = 10
          setAutoAcceptIn(seconds)
          const t = setInterval(() => {
            seconds -= 1
            setAutoAcceptIn(seconds)
            if (seconds <= 0) {
              clearInterval(t)
              approveRide(id)
            }
          }, 1000)
        }
      } else if (ride?.status === 'ontrip') {
        setStatus('ontrip')
      }
    }, 2000)
  }

  const approveRide = async (id: string) => {
    await fetch(`/api/match/${id}/approve`, { method: 'POST' })
    setStatus('enroute')
  }

  const declineRide = async (id: string) => {
    await fetch(`/api/match/${id}/decline`, { method: 'POST' })
    setStatus('idle')
    setMatchId(null)
    if (pollTimer.current) clearInterval(pollTimer.current)
  }

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current)
    }
  }, [])

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Rider Console (MVP)</h1>

      {status === 'idle' && (
        <button
          onClick={requestRide}
          className="px-4 py-2 rounded-full border border-gray-300 bg-white text-black hover:bg-gray-50"
        >
          Request Ride
        </button>
      )}

      {status === 'matching' && <p>Looking for a driver...</p>}

      {status === 'consent' && matchId && (
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

      {status === 'enroute' && <p>Driver on the way…</p>}
      {status === 'ontrip' && <p>Ride in progress…</p>}
    </div>
  )
}
