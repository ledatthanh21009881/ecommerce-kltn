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

const shipperIcon = createCustomIcon('#3B82F6', '🚚')
const destinationIcon = createCustomIcon('#10B981', '📍')
const selectedIcon = createCustomIcon('#EF4444', '🎯')

interface Props {
  orders: OrderTracking[]
  shippers: Shipper[]
  selectedOrderId?: number
  onOrderSelect?: (orderId: number) => void
  onShipperSelect?: (shipperId: number) => void
  className?: string
}

function MapUpdater({ orders, selectedOrderId }: { orders: OrderTracking[]; selectedOrderId?: number }) {
  const map = useMap()
  useEffect(() => {
    if (orders.length === 0) return
    const bounds = L.latLngBounds([])
    orders.forEach(o => { if (o.current_lat && o.current_lng) bounds.extend([o.current_lat, o.current_lng]) })
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] })
    else map.setView([10.762622, 106.660172], 12)
  }, [orders, map])

  useEffect(() => {
    if (!selectedOrderId) return
    const o = orders.find(x => x.order_id === selectedOrderId)
    if (o?.current_lat && o.current_lng) map.setView([o.current_lat, o.current_lng], 15)
  }, [selectedOrderId, orders, map])
  return null
}

export default function LeafletMapCore({ orders, shippers, selectedOrderId, onOrderSelect, onShipperSelect, className = '' }: Props) {
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
  const markers: MapMarker[] = []
  orders.forEach(o => {
    if (o.current_lat && o.current_lng) markers.push({ id: o.order_id, lat: o.current_lat, lng: o.current_lng, type: 'destination', title: `Order #${o.order_id}`, description: `${o.customer_name} - ${o.status}`, status: o.status, updated_at: o.location_updated_at })
  })
  shippers.forEach(s => {
    if (s.current_lat && s.current_lng) markers.push({ id: s.user_id, lat: s.current_lat, lng: s.current_lng, type: 'shipper', title: s.shipper_name, description: `${s.vehicle_info} - ${s.is_available ? 'Available' : 'Busy'}`, status: s.is_available ? 'available' : 'busy', updated_at: s.location_updated_at })
  })

  const getMarkerIcon = (m: MapMarker) => (m.id === selectedOrderId ? selectedIcon : m.type === 'shipper' ? shipperIcon : destinationIcon)
  const getStatusColor = (s?: string) => s === 'available' || s === 'delivered' ? 'bg-green-100 text-green-800' : s === 'busy' || s === 'failed' ? 'bg-red-100 text-red-800' : s === 'in_transit' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
  const formatTime = (d?: string) => (d ? new Date(d).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}) : 'N/A')

  return (
    <div ref={hostRef} className={`w-full h-96 rounded-lg overflow-hidden border ${className}`}>
      <MapContainer key={mapKey} center={[10.762622, 106.660172]} zoom={12} style={{ height: '100%', width: '100%' }} className="z-0">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapUpdater orders={orders} selectedOrderId={selectedOrderId} />
        {markers.map(m => (
          <Marker key={`${m.type}-${m.id}`} position={[m.lat, m.lng]} icon={getMarkerIcon(m)} eventHandlers={{
            click: () => {
              if (m.type === 'shipper' && onShipperSelect) onShipperSelect(m.id)
              else if (m.type === 'destination' && onOrderSelect) onOrderSelect(m.id)
            }
          }}>
            <Popup>
              <Card className="p-3 min-w-[200px]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {m.type === 'shipper' ? <Truck className="h-4 w-4 text-blue-600" /> : <MapPin className="h-4 w-4 text-green-600" />}
                    <span className="font-semibold">{m.title}</span>
                  </div>
                  <p className="text-sm text-gray-600">{m.description}</p>
                  <div className="flex items-center gap-2"><Badge className={getStatusColor(m.status)}>{m.status || 'Unknown'}</Badge></div>
                  {m.updated_at && (<div className="flex items-center gap-1 text-xs text-gray-500"><Clock className="h-3 w-3" />{formatTime(m.updated_at)}</div>)}
                  <div className="flex gap-1 pt-2">
                    {m.type === 'shipper' ? (
                      <Button size="sm" variant="outline" onClick={() => onShipperSelect?.(m.id)} className="text-xs"><Phone className="h-3 w-3 mr-1" />Contact</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => onOrderSelect?.(m.id)} className="text-xs">View Details</Button>
                    )}
                  </div>
                </div>
              </Card>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}


