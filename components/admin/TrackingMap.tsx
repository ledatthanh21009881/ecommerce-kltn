'use client'

import React, { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
const LeafletMapCore = dynamic(() => import('./LeafletMapCore'), { ssr: false })
import { OrderTracking, Shipper } from '@/lib/tracking-types'

import { Star } from 'lucide-react'

interface TrackingMapProps {
  orders: OrderTracking[]
  shippers: Shipper[]
  selectedOrderId?: number
  onOrderSelect?: (orderId: number) => void
  onShipperSelect?: (shipperId: number) => void
  className?: string
}

export default function TrackingMap({
  orders,
  shippers,
  selectedOrderId,
  onOrderSelect,
  onShipperSelect,
  className = ''
}: TrackingMapProps) {
  const [isClient, setIsClient] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Fix for SSR hydration
  useEffect(() => {
    setIsClient(true)
    const id = setTimeout(() => setShowMap(true), 50)
    return () => {
      setShowMap(false)
      // Defensive cleanup: clear any leftover Leaflet container id (fix double init in StrictMode)
      try {
        const host = containerRef.current
        if (host) {
          const leaf = host.querySelector('.leaflet-container') as any
          if (leaf) {
            try { delete leaf._leaflet_id } catch {}
            try { leaf.parentNode?.removeChild(leaf) } catch {}
          }
        }
      } catch {}
      clearTimeout(id)
    }
  }, [])

  if (!isClient) {
    return (
      <div className={`w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-gray-500">Loading map...</div>
      </div>
    )
  }


  return (
    <div ref={containerRef} className={`w-full h-96 rounded-lg overflow-hidden border ${className}`}>
      {showMap && (
        <LeafletMapCore
          orders={orders}
          shippers={shippers}
          selectedOrderId={selectedOrderId}
          onOrderSelect={onOrderSelect}
          onShipperSelect={onShipperSelect}
        />
      )}
    </div>
  )
}

// Legend component
export function MapLegend() {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <h3 className="font-semibold mb-3">Map Legend</h3>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
          <span className="text-sm">Shipper</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
          <span className="text-sm">Delivery Destination</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          <span className="text-sm">Selected Order</span>
        </div>
      </div>
    </div>
  )
}

// Stats component for map
export function MapStats({ 
  orders, 
  shippers 
}: { 
  orders: OrderTracking[]
  shippers: Shipper[]
}) {
  const activeOrders = orders.filter(order => 
    ['picking_up', 'picked_up', 'in_transit', 'arriving'].includes(order.status)
  )
  
  const availableShippers = shippers.filter(shipper => shipper.is_available)
  
  const ordersWithLocation = orders.filter(order => 
    order.current_lat && order.current_lng
  )

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white p-3 rounded-lg shadow-sm border text-center">
        <div className="text-2xl font-bold text-blue-600">{activeOrders.length}</div>
        <div className="text-sm text-gray-600">Active Orders</div>
      </div>
      <div className="bg-white p-3 rounded-lg shadow-sm border text-center">
        <div className="text-2xl font-bold text-green-600">{availableShippers.length}</div>
        <div className="text-sm text-gray-600">Available Shippers</div>
      </div>
      <div className="bg-white p-3 rounded-lg shadow-sm border text-center">
        <div className="text-2xl font-bold text-purple-600">{ordersWithLocation.length}</div>
        <div className="text-sm text-gray-600">With Location</div>
      </div>
    </div>
  )
}
