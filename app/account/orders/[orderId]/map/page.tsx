'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowLeft } from 'lucide-react'
import { userOrdersApi } from '@/lib/userOrdersApi'
import type { Shipper, OrderTracking } from '@/lib/tracking-types'
import ProtectedRoute from '@/components/protected-route'

const MapboxShipperDetailMapDemo = dynamic(
  () => import('@/components/admin/MapboxShipperDetailMapDemo'),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
        Đang tải bản đồ...
      </div>
    ),
  }
)

interface ShippingAddressSnapshot {
  address_line?: string
  ward?: string
  district?: string
  city?: string
}

interface OrderDetail {
  order_id: number
  status: string
  total_amount?: number
  shipping_address_snapshot?: string | null
  shipping_address?: ShippingAddressSnapshot | null
}

function isDeliveringStatus(status: string | undefined | null): boolean {
  const s = (status ?? '').toString().toLowerCase()
  return ['in_transit', 'picking_up', 'picked_up', 'arriving', 'shipping'].includes(s)
}

const DEMO_CENTER_LNG = 106.660172
const DEMO_CENTER_LAT = 10.762622
const DEMO_DEST_LNG = 106.67
const DEMO_DEST_LAT = 10.76

export default function OrderMapPage() {
  const params = useParams()
  const orderId = params?.orderId as string
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [shipper, setShipper] = useState<Shipper | null>(null)
  const [orders, setOrders] = useState<OrderTracking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) {
      setError('Invalid order')
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)
      const [detailRes, trackingRes] = await Promise.all([
        userOrdersApi.getOrderDetail(orderId),
        userOrdersApi.getOrderTracking(orderId),
      ])

      if (!detailRes.ok) {
        setError((detailRes.data as { message?: string })?.message ?? 'Không tìm thấy đơn hàng')
        setLoading(false)
        return
      }
      const detailPayload = detailRes.data as { success?: boolean; data?: OrderDetail }
      const orderPayload = detailPayload?.data ?? detailRes.data
      if (!orderPayload || typeof orderPayload !== 'object') {
        setError('Không tìm thấy đơn hàng')
        setLoading(false)
        return
      }
      const raw = orderPayload as Record<string, unknown>
      if (raw.shipping_address_snapshot && typeof raw.shipping_address_snapshot === 'string') {
        try {
          raw.shipping_address = JSON.parse(raw.shipping_address_snapshot as string) as ShippingAddressSnapshot
        } catch {
          raw.shipping_address = null
        }
      }
      setOrder(raw as unknown as OrderDetail)

      if (trackingRes.ok && trackingRes.data) {
        const rawTracking = trackingRes.data as { data?: { shipper?: Shipper | null; orders?: OrderTracking[] }; shipper?: Shipper | null; orders?: OrderTracking[] }
        const tracking = rawTracking.data ?? rawTracking
        setShipper(tracking.shipper ?? null)
        setOrders(tracking.orders ?? [])
      }
      setLoading(false)
    }

    load()
  }, [orderId])

  const isDelivering = isDeliveringStatus(order?.status ?? '')
  const hasRealMapData = shipper && orders.length > 0 && orders.some((o) => o.destination_lat && o.destination_lng)

  const mapShipper: Shipper = hasRealMapData && shipper
    ? shipper
    : {
        user_id: 0,
        shipper_name: 'Shipper (demo)',
        phone: '',
        vehicle_info: 'Xe máy',
        total_delivered: 0,
        is_available: false,
        status: 'active',
        created_at: new Date().toISOString(),
        current_lat: DEMO_CENTER_LAT,
        current_lng: DEMO_CENTER_LNG,
        active_orders_count: 1,
      }

  const mapOrders: OrderTracking[] = hasRealMapData && orders.length > 0
    ? orders
    : [{
        order_id: order?.order_id ?? 0,
        status: 'in_transit' as const,
        total_amount: order?.total_amount ?? 0,
        created_at: order?.created_at ?? new Date().toISOString(),
        customer_name: '',
        customer_phone: '',
        customer_address: '',
        shipper_id: 0,
        destination_lat: DEMO_DEST_LAT,
        destination_lng: DEMO_DEST_LNG,
        event_count: 0,
      }]

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f9fafb]">
          <p className="text-gray-500">Đang tải...</p>
        </div>
      </ProtectedRoute>
    )
  }

  if (error || !order) {
    return (
      <ProtectedRoute>
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#f9fafb] p-4">
          <p className="text-center text-gray-600">{error ?? 'Không tìm thấy đơn hàng'}</p>
          <Link
            href={`/account/orders/${orderId}`}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại đơn hàng
          </Link>
        </div>
      </ProtectedRoute>
    )
  }

  if (!isDelivering) {
    return (
      <ProtectedRoute>
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#f9fafb] p-4">
          <p className="text-center text-gray-600">Đơn hàng chưa trong trạng thái giao hàng.</p>
          <Link
            href={`/account/orders/${orderId}`}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại đơn hàng
          </Link>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="fixed inset-0 z-40 flex flex-col bg-white">
        {/* Header: full width, back button */}
        <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
          <Link
            href={`/account/orders/${orderId}`}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại đơn hàng
          </Link>
          {!hasRealMapData && (
            <span className="text-xs font-medium text-amber-600">Demo – vị trí mẫu</span>
          )}
        </header>
        {/* Map: full remaining height */}
        <div className="relative min-h-0 flex-1">
          <MapboxShipperDetailMapDemo
            shipper={mapShipper}
            orders={mapOrders}
            className="absolute inset-0 h-full w-full"
          />
        </div>
      </div>
    </ProtectedRoute>
  )
}
