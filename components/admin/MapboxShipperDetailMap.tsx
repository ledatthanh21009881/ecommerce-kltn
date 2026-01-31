'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { Map as MapboxMap, Source, Layer } from 'react-map-gl'
import type { MapRef } from 'react-map-gl'
import mapboxgl from 'mapbox-gl'
import { Shipper, OrderTracking } from '@/lib/tracking-types'
import { getRouteCoordinates, RoutePoint } from '@/lib/routeService'
import { Navigation } from 'lucide-react'

/**
 * DEMO-ONLY: Behaves exactly like the plain HTML Mapbox demo.
 * Vehicle marker moves strictly along routeCoords from Directions API.
 * Single source of truth: routeCoords (no GPS, no snapping).
 */
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ''
const DEFAULT_CENTER = { lng: 106.660172, lat: 10.762622 }
const ANIM_STEP_MS = 100 // Match HTML demo setInterval(100)

interface Props {
  shipper: Shipper | null
  orders: OrderTracking[]
  className?: string
}

export default function MapboxShipperDetailMap({
  shipper,
  orders,
  className = ''
}: Props) {
  const mapRef = useRef<MapRef | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const animRef = useRef<number | null>(null)

  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const routeCacheRef = useRef<Record<string, [number, number][]>>({})

  const activeOrder = useMemo(() => {
    if (!shipper) return null
    return orders
      .filter(
        o =>
          o.shipper_id === shipper.user_id &&
          o.destination_lat &&
          o.destination_lng &&
          ['picking_up', 'picked_up', 'in_transit', 'arriving'].includes(o.status)
      )
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0]
  }, [shipper, orders])

  const origin: RoutePoint | null = useMemo(() => {
    if (!shipper?.current_lat || !shipper?.current_lng) return null
    return { lat: shipper.current_lat, lng: shipper.current_lng }
  }, [shipper])

  const destination: RoutePoint | null = useMemo(() => {
    if (!activeOrder?.destination_lat || !activeOrder?.destination_lng) return null
    return { lat: activeOrder.destination_lat, lng: activeOrder.destination_lng }
  }, [activeOrder])

  useEffect(() => setMapReady(false), [shipper?.user_id])

  /* Route loading - origin/destination only for API call */
  useEffect(() => {
    if (!origin || !destination || !shipper) {
      setRouteCoords(null)
      return
    }
    const cacheKey = `shipper-${shipper.user_id}-${origin.lat},${origin.lng}-${destination.lat},${destination.lng}`
    const cached = routeCacheRef.current[cacheKey]
    if (cached) {
      setRouteCoords(cached)
      return
    }
    setRouteLoading(true)
    getRouteCoordinates(origin, destination)
      .then(coords => {
        if (coords?.length) {
          setRouteCoords(coords)
          routeCacheRef.current[cacheKey] = coords
        } else {
          setRouteCoords(null)
        }
      })
      .catch(() => setRouteCoords(null))
      .finally(() => setRouteLoading(false))
  }, [origin, destination, shipper])

  /* Camera: center on routeCoords[0], zoom 14, no fitBounds */
  useEffect(() => {
    if (!mapReady || !routeCoords?.length) return
    const ref = mapRef.current
    if (!ref?.getMap) return
    const map = ref.getMap()
    if (!map) return
    const center = routeCoords[0]
    map.flyTo({ center: [center[0], center[1]], zoom: 14, duration: 0 })
  }, [mapReady, routeCoords])

  /* Marker + animation: ONLY routeCoords, create once, animate by index */
  useEffect(() => {
    const map = mapRef.current?.getMap?.()
    if (!mapReady || !map || !routeCoords?.length) {
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
      if (animRef.current) {
        cancelAnimationFrame(animRef.current)
        animRef.current = null
      }
      return
    }

    const cleanup = () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current)
        animRef.current = null
      }
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
    }

    cleanup()

    const coords = routeCoords

    const el = document.createElement('div')
    el.style.width = '48px'
    el.style.height = '48px'
    el.style.borderRadius = '50%'
    el.style.background = 'linear-gradient(135deg,#10b981,#059669)'
    el.style.border = '3px solid white'
    el.style.boxShadow = '0 4px 12px rgba(0,0,0,.25)'
    el.style.display = 'flex'
    el.style.alignItems = 'center'
    el.style.justifyContent = 'center'
    el.style.fontSize = '24px'
    el.textContent = '🏍️'

    const marker = new mapboxgl.Marker({ element: el })
    markerRef.current = marker
    marker.setLngLat(coords[0]).addTo(map)

    let i = 0
    let lastTime = 0
    const animate = (time: number) => {
      if (!markerRef.current || i >= coords.length) return
      if (time - lastTime >= ANIM_STEP_MS || lastTime === 0) {
        lastTime = time
        markerRef.current.setLngLat(coords[i])
        i++
      }
      if (i < coords.length) {
        animRef.current = requestAnimationFrame(animate)
      }
    }
    animRef.current = requestAnimationFrame(animate)

    return cleanup
  }, [mapReady, routeCoords])

  if (!shipper || !MAPBOX_TOKEN) {
    return <div className={`h-96 bg-gray-100 rounded-lg ${className}`} />
  }

  const initialCenter = routeCoords?.length
    ? routeCoords[0]
    : [origin?.lng ?? DEFAULT_CENTER.lng, origin?.lat ?? DEFAULT_CENTER.lat]

  return (
    <div className={`w-full h-96 rounded-xl overflow-hidden border border-gray-200 shadow-lg relative ${className}`}>
      <MapboxMap
        key={`shipper-map-${shipper.user_id}`}
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        onLoad={() => setMapReady(true)}
        initialViewState={{
          longitude: initialCenter[0],
          latitude: initialCenter[1],
          zoom: 14
        }}
        minZoom={12}
        maxZoom={20}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        {mapReady && routeCoords && routeCoords.length > 0 && (
          <>
            <Source
              id="route"
              type="geojson"
              data={{
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: routeCoords }
              }}
            >
              <Layer
                id="route-line"
                type="line"
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                paint={{ 'line-color': '#10b981', 'line-width': 6 }}
              />
            </Source>

            <Source
              id="destination"
              type="geojson"
              data={{
                type: 'Feature',
                properties: {},
                geometry: { type: 'Point', coordinates: routeCoords[routeCoords.length - 1] }
              }}
            >
              <Layer
                id="destination-circle"
                type="circle"
                paint={{
                  'circle-radius': 12,
                  'circle-color': '#ef4444',
                  'circle-stroke-width': 3,
                  'circle-stroke-color': '#fff'
                }}
              />
            </Source>
          </>
        )}
      </MapboxMap>

      {routeLoading && (
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-2.5 rounded-xl shadow-lg z-10 flex items-center gap-2 text-sm font-medium text-gray-700">
          <Navigation className="h-4 w-4 animate-spin text-emerald-600" />
          <span>Đang tính tuyến đường…</span>
        </div>
      )}

      {!activeOrder && origin && (
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-3 rounded-xl shadow-lg z-10 max-w-xs border border-gray-100">
          <p className="font-semibold text-sm text-gray-800">Chưa có đơn đang giao</p>
          <p className="text-xs text-gray-500 mt-0.5">Shipper chưa nhận đơn vận chuyển.</p>
        </div>
      )}
    </div>
  )
}
