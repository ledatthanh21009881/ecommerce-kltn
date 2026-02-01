'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { Shipper, OrderTracking } from '@/lib/tracking-types'

/**
 * PURE DEMO MAP – HTML EQUIVALENT
 * --------------------------------
 * ✔ new mapboxgl.Map
 * ✔ Directions API (driving-traffic)
 * ✔ map.addSource / map.addLayer (route line + shipper circle)
 * ✔ Circle layer thay Marker DOM → khớp mọi zoom (cùng canvas/ projection)
 * ✔ setInterval cập nhật GeoJSON source cho animation
 *
 * ❌ No react-map-gl, No modal, No DOM Marker (gây lệch zoom)
 */

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ''
const DEFAULT_CENTER: [number, number] = [106.660172, 10.762622]
const ANIM_INTERVAL_MS = 100 // EXACT like HTML demo

interface Props {
  shipper: Shipper | null
  orders: OrderTracking[]
  className?: string
}

export default function MapboxShipperDetailMapDemo({
  shipper,
  orders,
  className = ''
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!shipper || !containerRef.current || !MAPBOX_TOKEN) return

    const start: [number, number] = shipper.current_lng && shipper.current_lat
      ? [shipper.current_lng, shipper.current_lat]
      : DEFAULT_CENTER

    const activeOrder = orders
      .filter(
        o =>
          o.shipper_id === shipper.user_id &&
          o.destination_lat &&
          o.destination_lng
      )
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0]

    if (!activeOrder) return

    const end: [number, number] = [
      activeOrder.destination_lng!,
      activeOrder.destination_lat!
    ]

    mapboxgl.accessToken = MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: start,
      zoom: 14
    })

    mapRef.current = map
    const container = containerRef.current

    map.on('load', async () => {
      map.resize()
      try {
        const url =
          `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/` +
          `${start[0]},${start[1]};${end[0]},${end[1]}` +
          `?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`

        const res = await fetch(url)
        const data = await res.json()
        const route = data.routes?.[0]?.geometry
        if (!route) return

        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: route,
            properties: {}
          }
        })

        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': '#1abc9c',
            'line-width': 5
          }
        })

        const coordinates = route.coordinates as [number, number][]

        // === SHIPPER AS CIRCLE LAYER (canvas, cùng hệ tọa độ với route → khớp mọi zoom) ===
        map.addSource('shipper-position', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Point',
              coordinates: coordinates[0]
            }
          }
        })

        map.addLayer({
          id: 'shipper-circle',
          type: 'circle',
          source: 'shipper-position',
          paint: {
            'circle-radius': 14,
            'circle-color': '#10b981',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#fff'
          }
        })

        setTimeout(() => map.resize(), 100)

        let i = 0
        const source = map.getSource('shipper-position') as mapboxgl.GeoJSONSource
        intervalRef.current = setInterval(() => {
          if (!source) return
          source.setData({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Point',
              coordinates: coordinates[i]
            }
          })
          i++
          if (i >= coordinates.length && intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }, ANIM_INTERVAL_MS)
      } catch (err) {
        console.error('Mapbox demo error:', err)
      }
    })

    const ro = new ResizeObserver(() => {
      map.resize()
    })
    if (container) ro.observe(container)

    return () => {
      ro.disconnect()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [shipper, orders])

  if (!shipper || !MAPBOX_TOKEN) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-100 rounded-lg">
        Select a shipper
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`w-full h-96 rounded-xl overflow-hidden border shadow ${className}`}
      style={{ minHeight: 400 }}
    />
  )
}
