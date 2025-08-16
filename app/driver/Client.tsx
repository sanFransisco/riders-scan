"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Offer {
  id: string
  status: string
  created_at: string
  expires_at: string | null
  pickup_lat: number | null
  pickup_lng: number | null
  driver_accepted_at: string | null
  rider_consented_at: string | null
}

export default function DriverClient() {
  const router = useRouter()
  const [online, setOnline] = useState(false)
  const [offers, setOffers] = useState<Offer[]>([])
  const [hasProfile, setHasProfile] = useState<boolean | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [paymentLink, setPaymentLink] = useState('')
  const [paymentActive, setPaymentActive] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [fareOpen, setFareOpen] = useState(false)
  const [fareRideId, setFareRideId] = useState<string | null>(null)
  const [fareAmount, setFareAmount] = useState<string>('')
  const [fareError, setFareError] = useState<string>('')
  const watchId = useRef<number | null>(null)
  const offersTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastCoords = useRef<{ lat: number; lng: number } | null>(null)

  const startHeartbeat = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported')
      return
    }
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed, heading } = pos.coords
        lastCoords.current = { lat: latitude, lng: longitude }
        fetch('/api/driver/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: latitude,
            lng: longitude,
            accuracy_m: Math.round(accuracy || 0),
            speed_kmh: speed != null ? Math.round(speed * 3.6) : null,
            heading_deg: heading != null ? Math.round(heading) : null,
            // TEMP: mark service for debugging selection
            service: 'Other'
          }),
        }).catch(() => {})
      },
      (err) => {
        console.error('Geolocation error', err)
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    )
  }

  const stopHeartbeat = () => {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current)
      heartbeatTimer.current = null
    }
  }

  const startOffersPolling = () => {
    const load = async () => {
      try {
        const res = await fetch('/api/driver/offers', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setOffers(data.offers || [])
        }
      } catch {}
    }
    load()
    offersTimer.current = setInterval(load, 2000)
  }

  const stopOffersPolling = () => {
    if (offersTimer.current) clearInterval(offersTimer.current)
    offersTimer.current = null
  }

  useEffect(() => {
    // Check driver profile; if missing, redirect to onboarding to capture license
    ;(async () => {
      try {
        const res = await fetch('/api/driver/profile', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (!data.driver) {
            router.push('/auth/onboarding?needLicense=1')
            setHasProfile(false)
            return
          }
          setHasProfile(true)
        } else {
          setHasProfile(true)
        }
      } catch {
        setHasProfile(true)
      }
    })()
    if (online) {
      startHeartbeat()
      startOffersPolling()
      // Keep last_seen fresh even if position doesn't change (browser throttling)
      heartbeatTimer.current = setInterval(() => {
        const lc = lastCoords.current
        if (!lc) return
        fetch('/api/driver/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: lc.lat, lng: lc.lng, service: 'Other' }),
        }).catch(() => {})
      }, 10000)
    } else {
      stopHeartbeat()
      stopOffersPolling()
      setOffers([])
    }
    return () => {
      stopHeartbeat()
      stopOffersPolling()
    }
  }, [online])

  // No profile editing here; handled in onboarding

  // Fire an initial heartbeat once when going online (before first GPS tick)
  useEffect(() => {
    if (!online) return
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      fetch('/api/driver/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy_m: Math.round(pos.coords.accuracy || 0),
          speed_kmh: pos.coords.speed != null ? Math.round(pos.coords.speed * 3.6) : null,
          heading_deg: pos.coords.heading != null ? Math.round(pos.coords.heading) : null,
          service: 'Other'
        })
      }).catch(() => {})
    })
  }, [online])

  const acceptOffer = async (id: string) => {
    await fetch(`/api/offers/${id}/accept`, { method: 'POST' })
  }

  const startRide = async (id: string) => {
    await fetch(`/api/rides/${id}/start`, { method: 'POST' })
  }

  const openFareOverlay = (id: string) => {
    setFareRideId(id)
    setFareAmount('')
    setFareError('')
    setFareOpen(true)
  }

  const submitFare = async () => {
    if (!fareRideId) return
    const n = Number(fareAmount)
    if (Number.isNaN(n) || n <= 0) {
      setFareError('Enter a valid amount greater than 0')
      return
    }
    setFareError('')
    await fetch(`/api/rides/${fareRideId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(n.toFixed(2)), currency: 'ILS' })
    })
    setFareOpen(false)
    setFareRideId(null)
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Driver Console (MVP)</h1>
        <button
          onClick={() => setOnline((v) => !v)}
          className="px-4 py-2 rounded-full border border-gray-300 bg-white text-black hover:bg-gray-50"
        >
          {online ? 'Go Offline' : 'Go Online'}
        </button>
      </div>

      <div className="flex gap-2 items-center">
        <button
          onClick={async () => {
            setShowHistory(true)
            setHistoryLoading(true)
            try {
              const res = await fetch('/api/rides/driver', { cache: 'no-store' })
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

        <button onClick={() => setShowPayment(true)} className="px-4 py-2 rounded-full border border-gray-300 bg-white text-black hover:bg-gray-50">Payment Settings</button>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h2 className="font-semibold mb-2">Incoming Offers</h2>
        {offers.length === 0 ? (
          <p className="text-sm text-gray-500">No offers yet.</p>
        ) : (
          <div className="space-y-3">
            {offers.map((o) => (
              <div key={o.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Ride ID: {o.id.slice(0, 8)}</div>
                    <div className="text-sm">Pickup: {o.pickup_lat?.toFixed(5)}, {o.pickup_lng?.toFixed(5)}</div>
                    <div className="text-xs text-gray-500">Status: {o.status}</div>
                  </div>
                  <div className="flex gap-2">
                    {!o.driver_accepted_at && (
                      <button
                        onClick={() => acceptOffer(o.id)}
                        className="px-3 py-1.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50"
                      >
                        Accept
                      </button>
                    )}
                    {o.status === 'enroute' && o.driver_accepted_at && (
                      <button
                        onClick={() => startRide(o.id)}
                        className="px-3 py-1.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50"
                      >
                        Start Ride
                      </button>
                    )}
                    {o.status === 'ontrip' && (
                      <button
                        onClick={() => openFareOverlay(o.id)}
                        className="px-3 py-1.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50"
                      >
                        Complete (enter fare)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showPayment && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="p-4 flex justify-end">
            <button
              onClick={() => setShowPayment(false)}
              className="px-3 py-2 rounded-full border border-gray-300 bg-white hover:bg-gray-50"
            >
              Close
            </button>
          </div>
          <div className="max-w-xl mx-auto p-4 space-y-3">
            <h2 className="text-xl font-semibold">Payment Settings</h2>
            <div className="space-y-2">
              <label className="block text-sm text-gray-700">Meshulam Grow business link</label>
              <input
                value={paymentLink}
                onChange={(e) => setPaymentLink(e.target.value)}
                placeholder="https://meshulam.biz/s/your-link"
                className="w-full px-3 py-2 border rounded-md"
              />
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={paymentActive} onChange={(e) => setPaymentActive(e.target.checked)} />
                Active (required to accept rides)
              </label>
              <div>
                <button
                  onClick={async () => {
                    try {
                      await fetch('/api/driver/payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ payment_link: paymentLink, payment_active: paymentActive, payment_provider: 'meshulam' })
                      })
                      alert('Saved')
                    } catch { alert('Failed to save') }
                  }}
                  className="px-4 py-2 rounded-full border border-gray-300 bg-white text-black hover:bg-gray-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {fareOpen && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="p-4 flex justify-end">
            <button
              onClick={() => { setFareOpen(false); setFareRideId(null) }}
              className="px-3 py-2 rounded-full border border-gray-300 bg-white hover:bg-gray-50"
            >
              Close
            </button>
          </div>
          <div className="max-w-xl mx-auto p-4 space-y-3">
            <h2 className="text-xl font-semibold">Complete Ride</h2>
            <div className="space-y-2">
              <label className="block text-sm text-gray-700">Fare amount (ILS)</label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={fareAmount}
                onChange={(e) => setFareAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border rounded-md"
              />
              {fareError && <div className="text-sm text-red-600">{fareError}</div>}
              <div>
                <button
                  onClick={submitFare}
                  className="px-4 py-2 rounded-full border border-gray-300 bg-white text-black hover:bg-gray-50"
                >
                  Save & Complete
                </button>
              </div>
            </div>
          </div>
        </div>
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
                    <div>Rider: {r.rider_name || '-'} ({r.rider_email || '-'})</div>
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
