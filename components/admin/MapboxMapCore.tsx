'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Map, Marker, Popup } from 'react-map-gl'
import type { MapRef } from 'react-map-gl'
import { MapMarker, OrderTracking, Shipper } from '@/lib/tracking-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Truck, Clock, Phone } from 'lucide-react'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ''

const DEFAULT_CENTER = { lng: 106.660172, lat: 10.762622 }
const DEFAULT_ZOOM = 12

interface Props {
  orders: OrderTracking[]
  shippers: Shipper[]
  selectedOrderId?: number
  onOrderSelect?: (orderId: number) => void
  onShipperSelect?: (shipperId: number) => void
  className?: string
}

function getShipperStatus(shipper: Shipper): 'available' | 'in_transit' | 'inactive' {
  if (shipper.status === 'inactive' || shipper.status === 'suspended') return 'inactive'
  if (shipper.is_available && shipper.active_orders_count === 0) return 'available'
  if (!shipper.is_available && shipper.active_orders_count > 0) return 'in_transit'
  return 'inactive'
}

function getMarkerColor(shipper: Shipper, isSelected: boolean): string {
  if (isSelected) return '#EF4444'
  const status = getShipperStatus(shipper)
  if (status === 'available') return '#10B981'
  if (status === 'in_transit') return '#3B82F6'
  return '#6B7280'
}

export default function MapboxMapCore({
  orders,
  shippers,
  onShipperSelect,
  className = ''
}: Props) {
  const mapRef = useRef<MapRef | null>(null)
  const [popupShipperId, setPopupShipperId] = useState<number | null>(null)

  const markers: MapMarker[] = []
  shippers.forEach(s => {
    if (s.current_lat != null && s.current_lng != null) {
      const status = getShipperStatus(s)
      markers.push({
        id: s.user_id,
        lat: s.current_lat,
        lng: s.current_lng,
        type: 'shipper',
        title: s.shipper_name,
        description: `${s.vehicle_info} - ${status === 'available' ? 'Available' : status === 'in_transit' ? 'In Transit' : 'Inactive'}`,
        status,
        updated_at: s.location_updated_at
      })
    }
  })

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || shippers.length === 0) return
    const withPos = shippers.filter(s => s.current_lat != null && s.current_lng != null)
    if (withPos.length === 0) return
    const lngs = withPos.map(s => s.current_lng!)
    const lats = withPos.map(s => s.current_lat!)
    const sw = [Math.min(...lngs), Math.min(...lats)] as [number, number]
    const ne = [Math.max(...lngs), Math.max(...lats)] as [number, number]
    map.fitBounds([sw, ne], { padding: 40, duration: 0 })
  }, [shippers])

  const getStatusColor = (s?: string) => {
    if (s === 'available') return 'bg-green-100 text-green-800'
    if (s === 'in_transit') return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-800'
  }
  const getStatusLabel = (s?: string) => {
    if (s === 'available') return 'Available'
    if (s === 'in_transit') return 'In Transit'
    if (s === 'inactive') return 'Inactive'
    return 'Unknown'
  }
  const formatTime = (d?: string) =>
    d ? new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'

  if (!MAPBOX_TOKEN) {
    return (
      <div className={`w-full h-96 rounded-lg border bg-gray-100 flex items-center justify-center ${className}`}>
        <p className="text-gray-600">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is not set.</p>
      </div>
    )
  }

  return (
    <div className={`w-full h-96 rounded-lg overflow-hidden border ${className}`}>
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: DEFAULT_CENTER.lng,
          latitude: DEFAULT_CENTER.lat,
          zoom: DEFAULT_ZOOM
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        {markers.map(m => {
          const shipper = shippers.find(s => s.user_id === m.id)
          const isSelected = false
          const color = shipper ? getMarkerColor(shipper, isSelected) : '#6B7280'
          return (
            <Marker
              key={`shipper-${m.id}`}
              longitude={m.lng}
              latitude={m.lat}
              anchor="center"
              onClick={e => {
                e.originalEvent.stopPropagation()
                setPopupShipperId(m.id)
                onShipperSelect?.(m.id)
              }}
            >
              <div
                style={{
                  backgroundColor: color,
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 18,
                  border: '3px solid #fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,.3)',
                  cursor: 'pointer'
                }}
              >
                {isSelected ? '🎯' : '🏍️'}
              </div>
            </Marker>
          )
        })}
        {popupShipperId != null && (() => {
          const m = markers.find(x => x.id === popupShipperId)
          const shipper = shippers.find(s => s.user_id === popupShipperId)
          if (!m) return null
          return (
            <Popup
              longitude={m.lng}
              latitude={m.lat}
              anchor="bottom"
              onClose={() => setPopupShipperId(null)}
              closeButton
              closeOnClick={false}
            >
              <Card className="p-3 min-w-[200px]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold">{m.title}</span>
                  </div>
                  <p className="text-sm text-gray-600">{m.description}</p>
                  {shipper && (
                    <>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(m.status)}>{getStatusLabel(m.status)}</Badge>
                        {shipper.active_orders_count > 0 && (
                          <Badge variant="outline">{shipper.active_orders_count} orders</Badge>
                        )}
                      </div>
                      {shipper.rating != null && (
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-yellow-500">★</span>
                          <span>{shipper.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </>
                  )}
                  {m.updated_at && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {formatTime(m.updated_at)}
                    </div>
                  )}
                  <div className="flex gap-1 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onShipperSelect?.(m.id)
                        setPopupShipperId(null)
                      }}
                      className="text-xs"
                    >
                      <Phone className="h-3 w-3 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            </Popup>
          )
        })()}
      </Map>
    </div>
  )
}
