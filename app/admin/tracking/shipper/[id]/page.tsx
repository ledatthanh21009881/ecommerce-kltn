'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { Shipper, OrderTracking } from '@/lib/tracking-types'
import { ensureArray } from '@/lib/tracking-types'
import { authUtils } from '@/lib/auth'
import { fetchJsonSafe } from '@/lib/api'

// Demo coordinates (tham khảo HTML: start=Shipper, end=Khách)
const DEMO_START: [number, number] = [108.21, 16.06]
const DEMO_END: [number, number] = [108.22, 16.05]

function getDemoShipperAndOrder(id: number): { shipper: Shipper; orders: OrderTracking[] } {
  const shipper: Shipper = {
    user_id: id,
    shipper_name: `Shipper Demo #${id}`,
    phone: '0900000000',
    vehicle_info: 'Honda Wave',
    rating: 4.8,
    on_time_delivery_pct: 95,
    total_delivered: 100,
    is_available: false,
    status: 'active',
    created_at: new Date().toISOString(),
    current_lat: DEMO_START[1],
    current_lng: DEMO_START[0],
    location_updated_at: new Date().toISOString(),
    active_orders_count: 1
  }
  const order: OrderTracking = {
    order_id: 1,
    status: 'shipping',
    total_amount: 0,
    created_at: new Date().toISOString(),
    customer_name: 'Điểm giao hàng demo',
    customer_phone: '',
    customer_address: '',
    shipper_id: id,
    destination_lat: DEMO_END[1],
    destination_lng: DEMO_END[0],
    event_count: 0,
    last_event_at: new Date().toISOString()
  }
  return { shipper, orders: [order] }
}

const MapboxShipperDetailMapDemo = dynamic(
  () => import('@/components/admin/MapboxShipperDetailMapDemo'),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-100 flex items-center justify-center">Loading map...</div> }
)

export default function ShipperTrackingPage() {
  const params = useParams()
  const router = useRouter()
  const shipperId = params?.id ? Number(params.id) : null
  const [shipper, setShipper] = useState<Shipper | null>(null)
  const [orders, setOrders] = useState<OrderTracking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    if (!shipperId || isNaN(shipperId)) {
      setError('Invalid shipper ID')
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const token = authUtils.getToken()
        if (!token) {
          const { shipper: demoShipper, orders: demoOrders } = getDemoShipperAndOrder(shipperId)
          setShipper(demoShipper)
          setOrders(demoOrders)
          setIsDemo(true)
          setLoading(false)
          return
        }

        const [shippersRes, ordersRes] = await Promise.all([
          fetchJsonSafe('api/backend/v1/shippers'),
          fetchJsonSafe('api/backend/v1/tracking/orders?limit=100')
        ])

        const shippersData = ensureArray<Shipper>(shippersRes.data?.data?.shippers ?? [])
        const ordersData = ensureArray<OrderTracking>(ordersRes.data?.data?.orders ?? [])
        const found = shippersData.find((s: Shipper) => s.user_id === shipperId)

        if (found) {
          setShipper(found)
          setOrders(ordersData)
          setIsDemo(false)
        } else {
          const { shipper: demoShipper, orders: demoOrders } = getDemoShipperAndOrder(shipperId)
          setShipper(demoShipper)
          setOrders(demoOrders)
          setIsDemo(true)
        }
      } catch (err) {
        console.error(err)
        const { shipper: demoShipper, orders: demoOrders } = getDemoShipperAndOrder(shipperId)
        setShipper(demoShipper)
        setOrders(demoOrders)
        setIsDemo(true)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [shipperId])

  const hasActiveOrder = shipper && orders.some(
    o => o.shipper_id === shipper.user_id && o.destination_lat && o.destination_lng &&
      o.status === 'shipping'
  )

  if (!shipperId || isNaN(shipperId)) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-gray-100">
        <p className="text-gray-600">Invalid shipper ID</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/admin/tracking')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-900" />
        <p className="mt-4 text-gray-600">Đang tải...</p>
      </div>
    )
  }

  if (error || !shipper) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-gray-100">
        <p className="text-red-600">{error ?? 'Không tìm thấy shipper'}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/admin/tracking')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
      </div>
    )
  }

  if (!hasActiveOrder) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-gray-100">
        <p className="text-gray-600">Shipper chưa có đơn hàng đang giao với điểm đến</p>
        <p className="text-sm text-gray-500 mt-1">{shipper.shipper_name}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/admin/tracking')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
      </div>
    )
  }

  return (
    <div className="w-screen h-screen flex flex-col">
      <header className="flex items-center gap-2 px-4 py-2 bg-white border-b shadow-sm shrink-0">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/tracking')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Quay lại
        </Button>
        <span className="font-semibold">
          {shipper.shipper_name} - Chi tiết tuyến đường
          {isDemo && <span className="ml-2 text-xs font-normal text-amber-600">(Demo)</span>}
        </span>
      </header>
      <div className="flex-1 min-h-0">
        <MapboxShipperDetailMapDemo
          shipper={shipper}
          orders={orders}
          className="w-full h-full"
        />
      </div>
    </div>
  )
}
