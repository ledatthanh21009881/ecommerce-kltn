'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Shipper, OrderTracking } from '@/lib/tracking-types'
import { getRoute, RoutePoint } from '@/lib/routeService'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Truck, MapPin, Clock, Phone, Navigation } from 'lucide-react'

// Fix default marker icons
try {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  })
} catch {}

const createCustomIcon = (color: string, icon: string) =>
  L.divIcon({
    html: `<div style="background-color:${color};width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;border:3px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.3);">${icon}</div>`,
    className: 'custom-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })

const shipperIcon = createCustomIcon('#3B82F6', '🚚')
const destinationIcon = createCustomIcon('#10B981', '📍')

interface ShipperDetailMapProps {
  shipper: Shipper | null
  orders: OrderTracking[]
  className?: string
}

function MapBoundsUpdater({ 
  origin, 
  destination 
}: { 
  origin: RoutePoint | null
  destination: RoutePoint | null 
}) {
  const map = useMap()
  
  useEffect(() => {
    if (!origin || !destination) return
    
    const bounds = L.latLngBounds([origin, destination])
    map.fitBounds(bounds, { padding: [50, 50] })
  }, [origin, destination, map])
  
  return null
}

export default function ShipperDetailMap({ 
  shipper, 
  orders,
  className = '' 
}: ShipperDetailMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [mapKey] = useState(() => `shipper-detail-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const [route, setRoute] = useState<RoutePoint[] | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const routeCacheRef = useRef<Map<string, RoutePoint[]>>(new Map())

  // Find active order for this shipper (get the first/most recent active order)
  const activeOrder = useMemo(() => {
    if (!shipper) return null
    const activeOrders = orders.filter(
      order => 
        order.shipper_id === shipper.user_id &&
        order.destination_lat &&
        order.destination_lng &&
        ['picking_up', 'picked_up', 'in_transit', 'arriving'].includes(order.status)
    )
    // Return the most recent order (by created_at) or first one
    if (activeOrders.length === 0) return null
    return activeOrders.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]
  }, [shipper, orders])

  // Get origin and destination
  const origin: RoutePoint | null = useMemo(() => {
    if (!shipper?.current_lat || !shipper?.current_lng) return null
    return { lat: shipper.current_lat, lng: shipper.current_lng }
  }, [shipper])

  const destination: RoutePoint | null = useMemo(() => {
    if (!activeOrder?.destination_lat || !activeOrder?.destination_lng) return null
    return { lat: activeOrder.destination_lat, lng: activeOrder.destination_lng }
  }, [activeOrder])

  // Fetch route when origin/destination changes
  useEffect(() => {
    if (!origin || !destination) {
      setRoute(null)
      return
    }

    // Check cache
    const cacheKey = `${origin.lat},${origin.lng}-${destination.lat},${destination.lng}`
    const cached = routeCacheRef.current.get(cacheKey)
    if (cached) {
      setRoute(cached)
      return
    }

    // Fetch route
    setRouteLoading(true)
    getRoute(origin, destination)
      .then(routeData => {
        if (routeData) {
          setRoute(routeData)
          // Cache the route
          routeCacheRef.current.set(cacheKey, routeData)
        }
        setRouteLoading(false)
      })
      .catch(error => {
        console.error('Error fetching route:', error)
        setRouteLoading(false)
      })
  }, [origin, destination])

  // Cleanup
  useEffect(() => {
    return () => {
      try {
        const host = hostRef.current
        if (!host) return
        const leaf = host.querySelector('.leaflet-container') as any
        if (leaf) {
          try { delete leaf._leaflet_id } catch {}
          try { leaf.parentNode?.removeChild(leaf) } catch {}
        }
      } catch {}
    }
  }, [])

  if (!shipper) {
    return (
      <div className={`w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-gray-500">Select a shipper to view details</div>
      </div>
    )
  }

  const formatTime = (d?: string) => 
    d ? new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'

  return (
    <div ref={hostRef} className={`w-full h-96 rounded-lg overflow-hidden border ${className}`}>
      <MapContainer 
        key={mapKey} 
        center={origin || [10.762622, 106.660172]} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }} 
        className="z-0"
      >
        <TileLayer 
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
        />
        <MapBoundsUpdater origin={origin} destination={destination} />
        
        {/* Shipper marker (origin) */}
        {origin && (
          <Marker position={[origin.lat, origin.lng]} icon={shipperIcon}>
            <Popup>
              <Card className="p-3 min-w-[200px]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold">{shipper.shipper_name}</span>
                  </div>
                  <p className="text-sm text-gray-600">{shipper.vehicle_info}</p>
                  <Badge className="bg-blue-100 text-blue-800">Current Location</Badge>
                  {shipper.location_updated_at && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {formatTime(shipper.location_updated_at)}
                    </div>
                  )}
                </div>
              </Card>
            </Popup>
          </Marker>
        )}

        {/* Destination marker */}
        {destination && activeOrder && (
          <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
            <Popup>
              <Card className="p-3 min-w-[200px]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <span className="font-semibold">Order #{activeOrder.order_id}</span>
                  </div>
                  <p className="text-sm text-gray-600">{activeOrder.customer_name}</p>
                  <p className="text-xs text-gray-500">{activeOrder.customer_address}</p>
                  <Badge className="bg-green-100 text-green-800">Delivery Destination</Badge>
                </div>
              </Card>
            </Popup>
          </Marker>
        )}

        {/* Route polyline */}
        {route && route.length > 0 && (
          <Polyline
            positions={route}
            pathOptions={{
              color: '#3B82F6',
              weight: 4,
              opacity: 0.7
            }}
          />
        )}

        {/* Loading indicator */}
        {routeLoading && (
          <div className="absolute top-4 left-4 bg-white p-2 rounded shadow z-[1000]">
            <div className="flex items-center gap-2 text-sm">
              <Navigation className="h-4 w-4 animate-spin" />
              <span>Calculating route...</span>
            </div>
          </div>
        )}

        {/* No active order message */}
        {!activeOrder && origin && (
          <div className="absolute top-4 left-4 bg-white p-3 rounded shadow z-[1000] max-w-xs">
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-1">No active delivery</p>
              <p className="text-xs">This shipper currently has no orders in transit.</p>
            </div>
          </div>
        )}
      </MapContainer>
    </div>
  )
}
