'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowLeft } from 'lucide-react'
import { userOrdersApi } from '@/lib/userOrdersApi'
import type { Shipper, OrderTracking } from '@/lib/tracking-types'
import { shipperDestinationDistanceKm, trackingHasDestination } from '@/lib/orderCustomerTracking'
import ProtectedRoute from '@/components/protected-route'
import { useLanguage } from '@/components/language-provider'

function MapLoadingOverlay() {
  const { t } = useLanguage()
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
      {t('orderMap.loadingMap')}
    </div>
  )
}

const MapboxShipperDetailMapDemo = dynamic(
  () => import('@/components/admin/MapboxShipperDetailMapDemo'),
  {
    ssr: false,
    loading: () => <MapLoadingOverlay />,
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
  created_at?: string
  shipping_address_snapshot?: string | null
  shipping_address?: ShippingAddressSnapshot | null
}

function isDeliveringStatus(status: string | undefined | null): boolean {
  const s = (status ?? '').toString().toLowerCase()
  return ['in_transit', 'picking_up', 'picked_up', 'arriving', 'shipping'].includes(s)
}

function parseUserTracking(body: unknown): { shipper: Shipper | null; orders: OrderTracking[] } {
  const rawTracking = body as {
    data?: { shipper?: Shipper | null; orders?: OrderTracking[] }
    shipper?: Shipper | null
    orders?: OrderTracking[]
  }
  const tracking = rawTracking.data ?? rawTracking
  return {
    shipper: tracking.shipper ?? null,
    orders: Array.isArray(tracking.orders) ? tracking.orders : [],
  }
}

export default function OrderMapPage() {
  const { t } = useLanguage()
  const params = useParams()
  const orderId = params?.orderId as string
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [shipper, setShipper] = useState<Shipper | null>(null)
  const [orders, setOrders] = useState<OrderTracking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /** Đồng bộ với marker trong map (GeoJSON), không cần setState shipper mỗi chu kỳ. */
  const [liveLatLng, setLiveLatLng] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    setLiveLatLng(null)
  }, [orderId])

  useEffect(() => {
    if (!orderId) {
      setError(t('orderDetail.invalidOrder'))
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
        setError((detailRes.data as { message?: string })?.message ?? t('orderDetail.notFound'))
        setLoading(false)
        return
      }
      const detailPayload = detailRes.data as { success?: boolean; data?: OrderDetail }
      const orderPayload = detailPayload?.data ?? detailRes.data
      if (!orderPayload || typeof orderPayload !== 'object') {
        setError(t('orderDetail.notFound'))
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
        const { shipper: nextS, orders: nextO } = parseUserTracking(trackingRes.data)
        setShipper(nextS)
        setOrders(nextO)
      }
      setLoading(false)
    }

    void load()
  }, [orderId, t])

  const numericOrderId = Number(orderId)
  const currentTrackingRow = useMemo(() => {
    if (!numericOrderId || Number.isNaN(numericOrderId)) return null
    return orders.find((o) => o.order_id === numericOrderId) ?? null
  }, [orders, numericOrderId])

  const latForDistance = liveLatLng?.lat ?? shipper?.current_lat ?? null
  const lngForDistance = liveLatLng?.lng ?? shipper?.current_lng ?? null

  const distanceKm =
    shipper &&
    currentTrackingRow &&
    latForDistance != null &&
    lngForDistance != null
      ? shipperDestinationDistanceKm(
          { ...shipper, current_lat: latForDistance, current_lng: lngForDistance },
          currentTrackingRow.destination_lat,
          currentTrackingRow.destination_lng,
        )
      : null

  const pollCustomerShipperLngLat = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    if (!orderId) return null
    const trackingRes = await userOrdersApi.getOrderTracking(orderId)
    if (!trackingRes.ok || !trackingRes.data) return null
    const { shipper: s } = parseUserTracking(trackingRes.data)
    const lat = s?.current_lat
    const lng = s?.current_lng
    if (lat == null || lng == null) return null
    const lt = typeof lat === 'number' ? lat : Number(lat)
    const ln = typeof lng === 'number' ? lng : Number(lng)
    if (!Number.isFinite(lt) || !Number.isFinite(ln)) return null
    return { lat: lt, lng: ln }
  }, [orderId])

  const hasRealMapData = Boolean(
    shipper &&
      currentTrackingRow &&
      trackingHasDestination({
        lat: currentTrackingRow.destination_lat,
        lng: currentTrackingRow.destination_lng,
      }),
  )

  const isDelivering = isDeliveringStatus(order?.status ?? '')

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f9fafb]">
          <p className="text-gray-500">{t('common.loading')}</p>
        </div>
      </ProtectedRoute>
    )
  }

  if (error || !order) {
    return (
      <ProtectedRoute>
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#f9fafb] p-4">
          <p className="text-center text-gray-600">{error ?? t('orderDetail.notFound')}</p>
          <Link
            href={`/account/orders/${orderId}`}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('orderMap.backToOrder')}
          </Link>
        </div>
      </ProtectedRoute>
    )
  }

  if (!isDelivering) {
    return (
      <ProtectedRoute>
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#f9fafb] p-4">
          <p className="text-center text-gray-600">{t('orderMap.notDelivering')}</p>
          <Link
            href={`/account/orders/${orderId}`}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('orderMap.backToOrder')}
          </Link>
        </div>
      </ProtectedRoute>
    )
  }

  if (!hasRealMapData || !shipper || !currentTrackingRow) {
    return (
      <ProtectedRoute>
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#f9fafb] p-4">
          <p className="text-center text-gray-700 max-w-sm">{t('orderMap.noMapData')}</p>
          <Link
            href={`/account/orders/${orderId}`}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('orderMap.backToOrder')}
          </Link>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="fixed inset-0 z-40 flex flex-col bg-white">
        <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
          <Link
            href={`/account/orders/${orderId}`}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('orderMap.backToOrder')}
          </Link>
          {distanceKm != null ? (
            <span className="text-xs font-medium text-gray-600">
              {t('orderMap.distanceToDelivery', { km: distanceKm.toFixed(2) })}
            </span>
          ) : null}
        </header>
        <div className="relative min-h-0 flex-1">
          <MapboxShipperDetailMapDemo
            shipper={shipper}
            orders={orders}
            pollLocation={pollCustomerShipperLngLat}
            onLiveLngLat={(lat, lng) => setLiveLatLng({ lat, lng })}
            className="absolute inset-0 h-full w-full"
          />
        </div>
      </div>
    </ProtectedRoute>
  )
}
