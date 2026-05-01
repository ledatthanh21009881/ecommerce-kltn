'use client'

import React, { useEffect, useMemo, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapPin } from 'lucide-react'
import type { OrderTracking } from '@/lib/tracking-types'
import { getRouteCoordinates } from '@/lib/routeService'
import type { RoutePoint } from '@/lib/routeService'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ''

interface Props {
  order: OrderTracking | null
  className?: string
}

/**
 * Bản đồ tuyến đường từ vị trí hiện tại (đơn) đến điểm giao — Mapbox Directions.
 */
export default function TrackingOrderRoutePreview({ order, className = '' }: Props) {
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const fitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const origin: RoutePoint | null = useMemo(() => {
    const lat = Number(order?.current_lat)
    const lng = Number(order?.current_lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng }
  }, [order])

  const destination: RoutePoint | null = useMemo(() => {
    const lat = Number(order?.destination_lat)
    const lng = Number(order?.destination_lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng }
  }, [order])

  useEffect(() => {
    if (!order || !origin || !destination || !containerRef.current || !MAPBOX_TOKEN) {
      return
    }

    mapboxgl.accessToken = MAPBOX_TOKEN
    let disposed = false
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [origin.lng, origin.lat],
      zoom: 13,
      minZoom: 11,
      maxZoom: 18,
    })
    mapRef.current = map

    const fitToRoute = () => {
      if (disposed || !mapRef.current || mapRef.current !== map) return
      map.resize()
      map.fitBounds(
        [
          [Math.min(origin.lng, destination.lng), Math.min(origin.lat, destination.lat)],
          [Math.max(origin.lng, destination.lng), Math.max(origin.lat, destination.lat)],
        ],
        { padding: 48, duration: 0 }
      )
    }

    map.on('load', async () => {
      let coords = await getRouteCoordinates(origin, destination)
      if (!coords || coords.length < 2) {
        coords = [[origin.lng, origin.lat], [destination.lng, destination.lat]]
      }

      if (disposed || !mapRef.current || mapRef.current !== map) return
      if (!map.isStyleLoaded()) return

      map.addSource('route-line', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords },
        },
      })
      map.addLayer({
        id: 'route-line-layer',
        type: 'line',
        source: 'route-line',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#7c3aed', 'line-width': 5 },
      })

      map.addSource('destination-point', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: coords[coords.length - 1] },
        },
      })
      map.addLayer({
        id: 'destination-point-layer',
        type: 'circle',
        source: 'destination-point',
        paint: {
          'circle-radius': 10,
          'circle-color': '#ef4444',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      })

      new mapboxgl.Marker({ color: '#7c3aed' })
        .setLngLat([origin.lng, origin.lat])
        .addTo(map)

      fitToRoute()
      fitTimerRef.current = setTimeout(fitToRoute, 120)
    })

    resizeObserverRef.current = new ResizeObserver(() => fitToRoute())
    resizeObserverRef.current.observe(containerRef.current)

    return () => {
      disposed = true
      if (fitTimerRef.current) {
        clearTimeout(fitTimerRef.current)
        fitTimerRef.current = null
      }
      resizeObserverRef.current?.disconnect()
      resizeObserverRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [order?.order_id, origin, destination])

  if (!MAPBOX_TOKEN) {
    return (
      <div className={`flex h-[360px] items-center justify-center rounded-xl border bg-slate-100 text-sm text-slate-600 ${className}`}>
        NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN chưa cấu hình.
      </div>
    )
  }

  if (!order) {
    return <div className={`h-[360px] rounded-xl border bg-slate-50 ${className}`} />
  }

  if (!origin || !destination) {
    return (
      <div className={`flex h-[360px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-slate-50 p-6 text-center text-sm text-slate-600 ${className}`}>
        <MapPin className="h-10 w-10 text-slate-300" />
        <p>Chưa đủ tọa độ GPS (vị trí hiện tại hoặc điểm giao) để vẽ tuyến.</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative h-[360px] w-full overflow-hidden rounded-xl border border-slate-200 shadow-inner ${className}`} />
  )
}
