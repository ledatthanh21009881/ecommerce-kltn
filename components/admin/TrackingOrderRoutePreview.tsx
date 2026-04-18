'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { Map as MapboxMap, Marker, Source, Layer } from 'react-map-gl'
import type { MapRef } from 'react-map-gl'
import { Navigation, MapPin } from 'lucide-react'
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
  const mapRef = useRef<MapRef | null>(null)
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const cacheRef = useRef<Record<string, [number, number][]>>({})

  const origin: RoutePoint | null = useMemo(() => {
    if (!order?.current_lat || !order?.current_lng) return null
    return { lat: order.current_lat, lng: order.current_lng }
  }, [order])

  const destination: RoutePoint | null = useMemo(() => {
    if (!order?.destination_lat || !order?.destination_lng) return null
    return { lat: order.destination_lat, lng: order.destination_lng }
  }, [order])

  useEffect(() => {
    if (!origin || !destination || !order) {
      setRouteCoords(null)
      return
    }
    const cacheKey = `${order.order_id}-${origin.lat},${origin.lng}-${destination.lat},${destination.lng}`
    const cached = cacheRef.current[cacheKey]
    if (cached) {
      setRouteCoords(cached)
      return
    }
    setRouteLoading(true)
    getRouteCoordinates(origin, destination)
      .then((coords) => {
        if (coords?.length) {
          setRouteCoords(coords)
          cacheRef.current[cacheKey] = coords
        } else {
          setRouteCoords([[origin.lng, origin.lat], [destination.lng, destination.lat]])
        }
      })
      .catch(() =>
        setRouteCoords([[origin.lng, origin.lat], [destination.lng, destination.lat]])
      )
      .finally(() => setRouteLoading(false))
  }, [order, origin, destination])

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    if (origin && destination) {
      const lngs = [origin.lng, destination.lng]
      const lats = [origin.lat, destination.lat]
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 48, duration: 400 }
      )
    }
  }, [origin, destination, routeCoords])

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

  const routeEnd = routeCoords?.[routeCoords.length - 1]

  return (
    <div className={`relative h-[360px] w-full overflow-hidden rounded-xl border border-slate-200 shadow-inner ${className}`}>
      <MapboxMap
        key={`order-route-${order.order_id}`}
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: origin.lng,
          latitude: origin.lat,
          zoom: 13,
        }}
        minZoom={11}
        maxZoom={18}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        {routeCoords && routeCoords.length > 0 && (
          <Source
            id={`route-line-${order.order_id}`}
            type="geojson"
            data={{
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: routeCoords },
            }}
          >
            <Layer
              id={`route-line-layer-${order.order_id}`}
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': '#7c3aed', 'line-width': 5 }}
            />
          </Source>
        )}

        {routeEnd && (
          <Source
            id={`dest-${order.order_id}`}
            type="geojson"
            data={{
              type: 'Feature',
              properties: {},
              geometry: { type: 'Point', coordinates: routeEnd },
            }}
          >
            <Layer
              id={`dest-circle-${order.order_id}`}
              type="circle"
              paint={{
                'circle-radius': 10,
                'circle-color': '#ef4444',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff',
              }}
            />
          </Source>
        )}

        <Marker longitude={origin.lng} latitude={origin.lat} anchor="center">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-br from-violet-600 to-indigo-600 text-lg shadow-lg"
            title="Vị trí hiện tại"
          >
            🏍️
          </div>
        </Marker>
      </MapboxMap>

      {routeLoading && (
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-lg border bg-white/95 px-3 py-2 text-xs font-medium text-slate-700 shadow-md backdrop-blur">
          <Navigation className="h-3.5 w-3.5 animate-spin text-violet-600" />
          Đang tải tuyến…
        </div>
      )}
    </div>
  )
}
