"use client"

import { useEffect, useRef, useState } from 'react'
import DriverOverlay from '@/components/DriverOverlay'
import type { DriverAnalytics } from '@/lib/supabase-db'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function RiderPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [matchId, setMatchId] = useState<string | null>(null)
  const [rideStatus, setRideStatus] = useState<string>('idle')
  const [consentDriver, setConsentDriver] = useState<{ license_plate?: string; full_name?: string; driver_profile_id?: string } | null>(null)
  const [overlayDriver, setOverlayDriver] = useState<DriverAnalytics | null>(null)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const overlayAutoOpened = useRef(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
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
      const res = await fetch(`/api/rides/${id}`, { cache: 'no-store' })
      if (!res.ok) return
      const { ride } = await res.json()
      if ((ride?.status === 'consented') || (ride?.driver_accepted_at && !ride?.rider_consented_at)) {
        setRideStatus('consent')
        setConsentDriver({ license_plate: ride.license_plate, full_name: ride.full_name, driver_profile_id: ride.driver_profile_id })
        // explicit consent only
        if (autoAcceptIn !== null) setAutoAcceptIn(null)
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
    // Restore active ride if exists (after refresh)
    ;(async () => {
      if (!session) return
      const res = await fetch('/api/rides/active', { cache: 'no-store' })
      if (res.ok) {
        const { ride } = await res.json()
        if (ride?.id) {
          setMatchId(ride.id)
          if (ride.status === 'pending') {
            setRideStatus('matching')
            startPolling(ride.id)
          } else if (ride.status === 'consented') {
            setRideStatus('consent')
            setConsentDriver({ license_plate: ride.license_plate, full_name: ride.full_name, driver_profile_id: ride.driver_profile_id })
            startPolling(ride.id)
          } else if (ride.status === 'ontrip') {
            setRideStatus('ontrip')
          } else if (ride.status === 'enroute') {
            setRideStatus('enroute')
          }
        }
      }
    })()
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status])

  // Auto-open analytics overlay on consent (once)
  useEffect(() => {
    const openOverlay = async () => {
      if (overlayAutoOpened.current) return
      if (rideStatus !== 'consent') return
      overlayAutoOpened.current = true
      try {
        if (consentDriver?.driver_profile_id) {
          const res = await fetch(`/api/drivers/${consentDriver.driver_profile_id}`)
          if (res.ok) {
            const data = await res.json()
            if (data?.analytics) {
              setOverlayDriver(data.analytics as DriverAnalytics)
              setOverlayOpen(true)
              return
            }
          }
        }
        if (consentDriver?.license_plate) {
          const res = await fetch(`/api/drivers?q=${encodeURIComponent(consentDriver.license_plate)}`)
          if (res.ok) {
            const list = await res.json()
            if (Array.isArray(list) && list.length > 0) {
              setOverlayDriver(list[0] as DriverAnalytics)
              setOverlayOpen(true)
              return
            }
          }
        }
      } catch {}
    }
    openOverlay()
  }, [rideStatus, consentDriver])

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Rider Console (MVP)</h1>

      <div>
        <button
          onClick={async () => {
            setShowHistory(true)
            setHistoryLoading(true)
            try {
              const res = await fetch('/api/rides/mine', { cache: 'no-store' })
              if (res.ok) {
                const data = await res.json()
                setHistory(data.rides || [])
              }
            } finally {
              setHistoryLoading(false)
            }
          }}
          className="px-4 py-2 rounded-full border border-gray-300 bg-white text-black hover:bg-gray-50"
        >
          My Rides
        </button>
      </div>

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
          {consentDriver && (
            <div className="mb-3 text-sm text-gray-700">
              <div>License: {consentDriver.license_plate || '—'}</div>
              {consentDriver.full_name && <div>Name: {consentDriver.full_name}</div>}
            </div>
          )}
          <div className="flex gap-2">
            {(consentDriver?.driver_profile_id || consentDriver?.license_plate) && (
              <button
                onClick={async () => {
                  try {
                    // Fetch analytics directly by driver id for accuracy
                    if (consentDriver?.driver_profile_id) {
                      const res = await fetch(`/api/drivers/${consentDriver.driver_profile_id}`)
                      if (res.ok) {
                        const data = await res.json()
                        if (data?.analytics) {
                          setOverlayDriver(data.analytics as DriverAnalytics)
                          setOverlayOpen(true)
                          return
                        }
                      }
                    }
                    if (consentDriver?.license_plate) {
                      const res2 = await fetch(`/api/drivers?q=${encodeURIComponent(consentDriver.license_plate)}`)
                      if (res2.ok) {
                        const list = await res2.json()
                        if (Array.isArray(list) && list.length > 0) {
                          setOverlayDriver(list[0] as DriverAnalytics)
                          setOverlayOpen(true)
                        }
                      }
                    }
                  } catch {}
                }}
                className="px-4 py-2 rounded-full border border-gray-300 bg-white hover:bg-gray-50"
              >
                View analytics
              </button>
            )}
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

      {overlayOpen && overlayDriver && (
        <DriverOverlay driver={overlayDriver} onClose={() => setOverlayOpen(false)} />
      )}

      {showHistory && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="p-4 flex justify-end">
            <button
              onClick={() => setShowHistory(false)}
              className="px-3 py-2 rounded-full border border-gray-300 bg-white hover:bg-gray-50"
            >
              Close
            </button>
          </div>
          <div className="max-w-3xl mx-auto p-4 space-y-3">
            <h2 className="text-xl font-semibold mb-2">My Rides</h2>
            {historyLoading ? (
              <p>Loading…</p>
            ) : history.length === 0 ? (
              <p className="text-gray-500">No rides yet</p>
            ) : (
              history.map((r) => (
                <div key={r.id} className="border rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <div>
                      <div className="font-mono">{r.id.slice(0,8)}</div>
                      <div className="text-gray-600">Status: {r.status}</div>
                    </div>
                    <div className="text-right text-gray-600">
                      <div>{new Date(r.created_at).toLocaleString()}</div>
                      {r.ended_at && <div>Ended: {new Date(r.ended_at).toLocaleString()}</div>}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-700">
                    <div>Pickup: {r.pickup_lat?.toFixed?.(5) ?? '-'}, {r.pickup_lng?.toFixed?.(5) ?? '-'}</div>
                    <div>Driver: {r.full_name || '-'} ({r.license_plate || '-'})</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
