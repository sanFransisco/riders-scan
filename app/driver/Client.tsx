"use client"

import { useEffect, useRef, useState } from 'react'

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
  const [online, setOnline] = useState(false)
  const [offers, setOffers] = useState<Offer[]>([])
  const [hasProfile, setHasProfile] = useState<boolean | null>(null)
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
    // Optional: could load profile here if needed for future UI
    setHasProfile(true)
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

  const completeRide = async (id: string) => {
    await fetch(`/api/rides/${id}/complete`, { method: 'POST' })
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
                    {o.status === 'consented' && o.driver_accepted_at && (
                      <button
                        onClick={() => startRide(o.id)}
                        className="px-3 py-1.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50"
                      >
                        Start Ride
                      </button>
                    )}
                    {o.status === 'ontrip' && (
                      <button
                        onClick={() => completeRide(o.id)}
                        className="px-3 py-1.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50"
                      >
                        Complete Ride
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
