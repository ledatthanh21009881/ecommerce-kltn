'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { Map as MapboxMap, Marker, Source, Layer } from 'react-map-gl'
import type { MapRef } from 'react-map-gl'
import { Shipper, OrderTracking } from '@/lib/tracking-types'
import { getRouteCoordinates, RoutePoint } from '@/lib/routeService'
import { Navigation } from 'lucide-react'

/**
 * Production map: react-map-gl, GPS-based, route display.
 * Use MapboxShipperDetailMapDemo for demo/presentation.
 */
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ''
const DEFAULT_CENTER = { lng: 106.660172, lat: 10.762622 }

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
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
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

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || !origin) return
    if (routeCoords?.length) {
      const c = routeCoords[0]
      map.flyTo({ center: [c[0], c[1]], zoom: 14, duration: 0 })
    } else {
      map.flyTo({ center: [origin.lng, origin.lat], zoom: 14, duration: 0 })
    }
  }, [origin, routeCoords])

  const routeEnd = routeCoords?.[routeCoords.length - 1]

  if (!shipper || !MAPBOX_TOKEN) {
    return <div className={`h-96 bg-gray-100 rounded-lg ${className}`} />
  }

  return (
    <div className={`w-full h-96 rounded-xl overflow-hidden border border-gray-200 shadow-lg relative ${className}`}>
      <MapboxMap
        key={`shipper-map-${shipper.user_id}`}
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: origin?.lng ?? DEFAULT_CENTER.lng,
          latitude: origin?.lat ?? DEFAULT_CENTER.lat,
          zoom: 14
        }}
        minZoom={12}
        maxZoom={20}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        {routeCoords && routeCoords.length > 0 && (
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
        )}

        {routeEnd && (
          <Source
            id="destination"
            type="geojson"
            data={{
              type: 'Feature',
              properties: {},
              geometry: { type: 'Point', coordinates: routeEnd }
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
        )}

        {origin && (
          <Marker longitude={origin.lng} latitude={origin.lat} anchor="center">
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#10b981,#059669)',
                border: '3px solid white',
                boxShadow: '0 4px 12px rgba(0,0,0,.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24
              }}
            >
              🏍️
            </div>
          </Marker>
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
