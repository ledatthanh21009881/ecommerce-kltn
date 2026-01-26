'use client'

import React, { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapMarker, OrderTracking, Shipper } from '@/lib/tracking-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MapPin, Truck, Clock, Phone } from 'lucide-react'

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

// Shipper status icons with different colors
const shipperAvailableIcon = createCustomIcon('#10B981', '🚚') // Green for available
const shipperInTransitIcon = createCustomIcon('#3B82F6', '🚚') // Blue for in_transit
const shipperInactiveIcon = createCustomIcon('#6B7280', '🚚') // Gray for inactive
const shipperSelectedIcon = createCustomIcon('#EF4444', '🎯') // Red for selected

interface Props {
  orders: OrderTracking[]
  shippers: Shipper[]
  selectedOrderId?: number
  selectedShipperId?: number
  onOrderSelect?: (orderId: number) => void
  onShipperSelect?: (shipperId: number) => void
  className?: string
}

function MapUpdater({ shippers, selectedShipperId }: { shippers: Shipper[]; selectedShipperId?: number }) {
  const map = useMap()
  useEffect(() => {
    if (shippers.length === 0) return
    const bounds = L.latLngBounds([])
    shippers.forEach(s => { if (s.current_lat && s.current_lng) bounds.extend([s.current_lat, s.current_lng]) })
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] })
    else map.setView([10.762622, 106.660172], 12)
  }, [shippers, map])

  useEffect(() => {
    if (!selectedShipperId) return
    const s = shippers.find(x => x.user_id === selectedShipperId)
    if (s?.current_lat && s.current_lng) map.setView([s.current_lat, s.current_lng], 15)
  }, [selectedShipperId, shippers, map])
  return null
}

export default function LeafletMapCore({ orders, shippers, selectedOrderId, selectedShipperId, onOrderSelect, onShipperSelect, className = '' }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [mapKey] = useState(() => `leaflet-${Date.now()}-${Math.random().toString(36).slice(2)}`)

  // Cleanup any leftover leaflet container on unmount
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

  // Determine shipper status and create markers
  const getShipperStatus = (shipper: Shipper): 'available' | 'in_transit' | 'inactive' => {
    if (shipper.status === 'inactive' || shipper.status === 'suspended') {
      return 'inactive'
    }
    if (shipper.is_available && shipper.active_orders_count === 0) {
      return 'available'
    }
    if (!shipper.is_available && shipper.active_orders_count > 0) {
      return 'in_transit'
    }
    return 'inactive'
  }

  const getShipperIcon = (shipper: Shipper, isSelected: boolean) => {
    if (isSelected) return shipperSelectedIcon
    const status = getShipperStatus(shipper)
    switch (status) {
      case 'available':
        return shipperAvailableIcon
      case 'in_transit':
        return shipperInTransitIcon
      case 'inactive':
        return shipperInactiveIcon
      default:
        return shipperInactiveIcon
    }
  }

  // Only create shipper markers (fleet overview)
  const markers: MapMarker[] = []
  shippers.forEach(s => {
    if (s.current_lat && s.current_lng) {
      const status = getShipperStatus(s)
      markers.push({ 
        id: s.user_id, 
        lat: s.current_lat, 
        lng: s.current_lng, 
        type: 'shipper', 
        title: s.shipper_name, 
        description: `${s.vehicle_info} - ${status === 'available' ? 'Available' : status === 'in_transit' ? 'In Transit' : 'Inactive'}`, 
        status: status, 
        updated_at: s.location_updated_at 
      })
    }
  })

  const getStatusColor = (s?: string) => {
    if (s === 'available') return 'bg-green-100 text-green-800'
    if (s === 'in_transit') return 'bg-blue-100 text-blue-800'
    if (s === 'inactive') return 'bg-gray-100 text-gray-800'
    return 'bg-gray-100 text-gray-800'
  }
  
  const getStatusLabel = (s?: string) => {
    if (s === 'available') return 'Available'
    if (s === 'in_transit') return 'In Transit'
    if (s === 'inactive') return 'Inactive'
    return 'Unknown'
  }
  
  const formatTime = (d?: string) => (d ? new Date(d).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}) : 'N/A')

  return (
    <div ref={hostRef} className={`w-full h-96 rounded-lg overflow-hidden border ${className}`}>
      <MapContainer key={mapKey} center={[10.762622, 106.660172]} zoom={12} style={{ height: '100%', width: '100%' }} className="z-0">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapUpdater shippers={shippers} selectedShipperId={selectedShipperId} />
        {markers.map(m => {
          const shipper = shippers.find(s => s.user_id === m.id)
          const isSelected = selectedShipperId === m.id
          return (
            <Marker 
              key={`shipper-${m.id}`} 
              position={[m.lat, m.lng]} 
              icon={shipper ? getShipperIcon(shipper, isSelected) : shipperInactiveIcon}
              eventHandlers={{
                click: () => {
                  if (onShipperSelect) onShipperSelect(m.id)
                }
              }}
            >
              <Popup>
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
                        {shipper.rating && (
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
                        onClick={() => onShipperSelect?.(m.id)} 
                        className="text-xs"
                      >
                        <Phone className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </Card>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}


