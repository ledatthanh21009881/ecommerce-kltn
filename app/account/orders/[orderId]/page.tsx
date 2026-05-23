'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { ArrowLeft, Phone, MessageCircle } from 'lucide-react'
import { userOrdersApi } from '@/lib/userOrdersApi'
import type { Shipper, OrderTracking } from '@/lib/tracking-types'
import { ORDER_STATUS_CONFIG } from '@/lib/tracking-types'
import { shipperDestinationDistanceKm } from '@/lib/orderCustomerTracking'
import ProtectedRoute from '@/components/protected-route'
import { CustomerOrderStatusBar } from '@/components/account/CustomerOrderStatusBar'
import { DeliveryProofThumbnail } from '@/components/orders/DeliveryProofThumbnail'
import { pickLatestProof, type DeliveryProof } from '@/lib/deliveryProofs'
import { useLanguage } from '@/components/language-provider'

/** Resolve product image URL: use as-is if absolute, else prepend backend base from env. */
function productImageSrc(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const base = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_BACKEND_URL ?? '' : ''
  return base ? `${base.replace(/\/$/, '')}${url.startsWith('/') ? url : `/${url}`}` : url
}

interface OrderItemDetail {
  product_name?: string
  product_image?: string | null
  quantity: number
  price?: number
  subtotal?: number
  size_name?: string
  sku?: string
}

interface ShippingAddressSnapshot {
  address_line?: string
  ward?: string
  district?: string
  city?: string
  phone?: string
  recipient_name?: string
}

interface PaymentInfo {
  payment_id?: number
  order_id?: number
  method?: string
  status?: string
  paid_amount?: number
  transaction_id?: string | null
  created_at?: string
}

interface OrderDetail {
  order_id: number
  invoice_number?: string | null
  customer_id?: number
  status: string
  total_amount: number
  shipping_fee?: number
  created_at: string
  estimated_delivery_at?: string | null
  note?: string | null
  shipping_address_snapshot?: string | null
  shipping_address?: ShippingAddressSnapshot | null
  items?: OrderItemDetail[]
  payment?: PaymentInfo | null
  tracking?: {
    shipper_id?: number
    first_name?: string
    last_name?: string
    phone?: string
    vehicle_info?: string
    rating?: number
  } | null
  delivery_proofs?: DeliveryProof[]
}

function getStatusBadgeClass(status: string | undefined | null): string {
  const s = (status ?? '').toString().toLowerCase()
  if (s === 'pending' || s === 'processing' || s === 'confirmed' || s === 'assigned') return 'bg-amber-100 text-amber-800'
  if (s === 'shipping' || s === 'in_transit' || s === 'picking_up' || s === 'picked_up' || s === 'arriving') return 'bg-blue-100 text-blue-800'
  if (s === 'delivered' || s === 'completed') return 'bg-green-100 text-green-800'
  if (s === 'cancelled' || s === 'failed' || s === 'returned') return 'bg-red-100 text-red-800'
  return 'bg-gray-100 text-gray-800'
}

const ORDER_DETAIL_STATUS_KEYS = [
  'processing',
  'shipping',
  'completed',
  'packaged',
  'packaging',
  'ready_to_ship',
  'payment_pending',
] as const

function getStatusLabel(
  status: string | undefined | null,
  t: (key: string) => string,
): string {
  const raw = (status ?? '').toString().trim()
  const s = raw.toLowerCase()
  if (!s) return '—'
  if ((ORDER_DETAIL_STATUS_KEYS as readonly string[]).includes(s)) {
    return t(`orderDetail.status.${s}`)
  }
  const key = s as keyof typeof ORDER_STATUS_CONFIG
  if (key in ORDER_STATUS_CONFIG) return ORDER_STATUS_CONFIG[key].label
  return raw
}

function isDeliveringStatus(status: string | undefined | null): boolean {
  const s = (status ?? '').toString().toLowerCase()
  return ['in_transit', 'picking_up', 'picked_up', 'arriving', 'shipping'].includes(s)
}

function formatDateTime(dateString: string) {
  const d = new Date(dateString)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${h}:${m}`
}

function getPaymentMethodLabel(method: string | undefined, t: (key: string) => string): string {
  if (!method) return '—'
  const m = method.toLowerCase()
  if (m === 'cod' || m === 'cash') return t('orderDetail.pay.cod')
  if (m === 'payos' || m === 'bank_transfer') return t('orderDetail.pay.bank')
  if (m === 'vnpay') return t('orderDetail.pay.vnpay')
  if (m === 'momo') return t('orderDetail.pay.momo')
  return method
}

function getPaymentStatusLabel(
  status: string | undefined,
  t: (key: string) => string,
  method?: string | undefined,
): string {
  if (!status) return '—'
  const s = status.toLowerCase()
  const m = (method ?? '').toLowerCase()
  if (m === 'cod' || m === 'cash') {
    if (s === 'pending') return t('orderDetail.codUnpaid')
    if (s === 'confirmed' || s === 'paid' || s === 'success' || s === 'completed') {
      return t('orderDetail.pay.codCollected')
    }
  }
  if (s === 'pending') return t('orderDetail.pay.pending')
  if (s === 'confirmed' || s === 'paid' || s === 'success' || s === 'completed') {
    return t('orderDetail.pay.paid')
  }
  if (s === 'failed' || s === 'cancelled' || s === 'expired') return t('orderDetail.pay.failed')
  if (s === 'refunded' || s === 'partially_refunded') return t('orderDetail.pay.refunded')
  return status
}

function getPaymentStatusBadgeClass(status: string | undefined, method?: string | undefined): string {
  if (!status) return 'bg-gray-100 text-gray-800'
  const s = status.toLowerCase()
  const m = (method ?? '').toLowerCase()
  if (m === 'cod' || m === 'cash') {
    if (s === 'pending') return 'bg-sky-100 text-sky-900 ring-1 ring-sky-200'
    if (s === 'confirmed' || s === 'paid' || s === 'success' || s === 'completed') {
      return 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200'
    }
  }
  if (s === 'pending') return 'bg-amber-100 text-amber-900 ring-1 ring-amber-200'
  if (s === 'confirmed' || s === 'paid' || s === 'success' || s === 'completed') {
    return 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200'
  }
  if (s === 'failed' || s === 'cancelled' || s === 'expired') {
    return 'bg-red-100 text-red-900 ring-1 ring-red-200'
  }
  if (s === 'refunded' || s === 'partially_refunded') {
    return 'bg-slate-200 text-slate-900 ring-1 ring-slate-300'
  }
  return 'bg-gray-100 text-gray-800 ring-1 ring-gray-200'
}

export default function OrderDetailPage() {
  const { t } = useLanguage()
  const params = useParams()
  const orderId = params?.orderId as string
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [shipper, setShipper] = useState<Shipper | null>(null)
  const [orders, setOrders] = useState<OrderTracking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        const rawTracking = trackingRes.data as {
          data?: { shipper?: Shipper | null; orders?: OrderTracking[] }
          shipper?: Shipper | null
          orders?: OrderTracking[]
        }
        const tracking = rawTracking.data ?? rawTracking
        setShipper(tracking.shipper ?? null)
        setOrders(tracking.orders ?? [])
      }
      setLoading(false)
    }

    void load()
  }, [orderId, t])

  /** Cập nhật vị trí shipper định kỳ khi đơn đang giao (API cùng hệ `/admin/tracking`). */
  useEffect(() => {
    if (!orderId || !order?.status || !isDeliveringStatus(order.status)) return undefined

    let cancelled = false
    const tick = async () => {
      try {
        const trackingRes = await userOrdersApi.getOrderTracking(orderId)
        if (cancelled || !trackingRes.ok || !trackingRes.data) return
        const rawTracking = trackingRes.data as {
          data?: { shipper?: Shipper | null; orders?: OrderTracking[] }
          shipper?: Shipper | null
          orders?: OrderTracking[]
        }
        const tracking = rawTracking.data ?? rawTracking
        setShipper(tracking.shipper ?? null)
        setOrders(tracking.orders ?? [])
      } catch {
        /* noop */
      }
    }

    void tick()
    const idTimer = window.setInterval(() => void tick(), 45000)
    return () => {
      cancelled = true
      window.clearInterval(idTimer)
    }
  }, [orderId, order?.status])

  const formatDate = (dateString: string) => {
    const d = new Date(dateString)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(amount)

  const numericOrderId = Number(orderId)
  const currentTrackingRow = useMemo(() => {
    if (!numericOrderId || Number.isNaN(numericOrderId)) return null
    return orders.find((o) => o.order_id === numericOrderId) ?? null
  }, [orders, numericOrderId])

  const distanceKm =
    shipper && currentTrackingRow
      ? shipperDestinationDistanceKm(shipper, currentTrackingRow.destination_lat, currentTrackingRow.destination_lng)
      : null

  const isDelivering = isDeliveringStatus(order?.status ?? '')
  /** Nút bản đồ: mở khi đơn đang giao (không còn giới hạn 1 km). */
  const showNearDestinationMapLink = Boolean(isDelivering)
  const distanceForBar = isDelivering && distanceKm !== null ? distanceKm : null

  const shippingAddress = order?.shipping_address
  const addressLine = shippingAddress?.address_line ??
    ([shippingAddress?.ward, shippingAddress?.district, shippingAddress?.city].filter(Boolean).join(', ') || null)
  const payment = order?.payment

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f9fafb] pt-24 pb-12">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="mx-auto max-w-4xl animate-pulse space-y-4">
              <div className="h-6 w-48 rounded-xl bg-gray-200" />
              <div className="h-32 rounded-2xl bg-gray-200" />
              <div className="h-64 rounded-2xl bg-gray-200" />
            </div>
          </div>
        </main>
      </ProtectedRoute>
    )
  }

  if (error || !order) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f9fafb] pt-24 pb-12">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <Link
              href="/account"
              className="inline-flex items-center text-sm text-gray-600 hover:text-black mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('orderDetail.backToAccount')}
            </Link>
            <p className="text-red-600">{error ?? t('orderDetail.notFound')}</p>
            <Link
              href="/account"
              className="mt-4 inline-block rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('orderDetail.backToAccount')}
            </Link>
          </div>
        </main>
      </ProtectedRoute>
    )
  }

  const orderLabel = order.invoice_number ?? `ORD-${order.order_id}`
  const resolvedShipperId = shipper?.user_id ?? order.tracking?.shipper_id ?? null
  const resolvedShipperName =
    shipper?.shipper_name ??
    [order.tracking?.first_name, order.tracking?.last_name].filter(Boolean).join(' ') ??
    ''
  const messengerParams = new URLSearchParams({
    order_id: String(order.order_id),
    returnTo: `/account/orders/${orderId}`,
  })
  if (resolvedShipperId) {
    messengerParams.set('shipper_id', String(resolvedShipperId))
    if (resolvedShipperName.trim()) {
      messengerParams.set('shipper_name', resolvedShipperName.trim())
    }
  }
  const messengerHref = `/messenger?${messengerParams.toString()}`
  const mapHref = `/account/orders/${orderId}/map`

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f9fafb] pt-24 pb-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Header */}
            <header>
              <Link
                href="/account"
                className="inline-flex items-center text-sm text-gray-600 hover:text-black mb-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('orderDetail.backToAccount')}
              </Link>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="font-sans text-2xl font-bold text-black">{orderLabel}</h1>
                <span
                  className={`rounded-xl px-3 py-1 text-xs font-medium ${getStatusBadgeClass(order.status)}`}
                >
                  {getStatusLabel(order.status, t)}
                </span>
              </div>
            </header>

            <CustomerOrderStatusBar
              status={order.status}
              distanceKm={distanceForBar ?? undefined}
              showNearDestinationMapLink={showNearDestinationMapLink}
              mapHref={mapHref}
            />

            {/* Một khối chi tiết đơn (hóa đơn) */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm overflow-hidden">
              {/* Thông tin đơn hàng */}
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4" style={{ fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' }}>{t('orderDetail.orderInfo')}</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm mb-5">
                <div>
                  <dt className="text-gray-500">{t('orderDetail.orderId')}</dt>
                  <dd className="font-medium text-black">#{order.order_id}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">{t('orderDetail.invoiceNumber')}</dt>
                  <dd className="font-medium text-black">{orderLabel}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">{t('orderDetail.orderDate')}</dt>
                  <dd className="text-gray-800">{formatDateTime(order.created_at)}</dd>
                </div>
                {order.estimated_delivery_at && (
                  <div>
                    <dt className="text-gray-500">{t('orderDetail.estimatedDelivery')}</dt>
                    <dd className="text-gray-800">{formatDate(order.estimated_delivery_at)}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-gray-500">{t('orderDetail.status')}</dt>
                  <dd>
                    <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                      {getStatusLabel(order.status, t)}
                    </span>
                  </dd>
                </div>
              </dl>

              {/* Địa chỉ giao hàng */}
              {(addressLine || shippingAddress?.recipient_name || shippingAddress?.phone) && (
                <div className="border-t border-gray-100 pt-6 pb-6">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3" style={{ fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' }}>{t('orderDetail.shippingAddress')}</h2>
                  <div className="text-sm space-y-1">
                    {shippingAddress?.recipient_name && (
                      <p className="font-medium text-black">{shippingAddress.recipient_name}</p>
                    )}
                    {shippingAddress?.phone && (
                      <p className="text-gray-700">{t('orderDetail.phoneLabel')}: {shippingAddress.phone}</p>
                    )}
                    {addressLine && <p className="text-gray-800">{addressLine}</p>}
                  </div>
                </div>
              )}

              {/* Sản phẩm */}
              <div className="border-t border-gray-100 pt-6 pb-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4" style={{ fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' }}>{t('orderDetail.items')}</h2>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left p-3 font-medium text-gray-600 w-16">{t('orderDetail.image')}</th>
                        <th className="text-left p-3 font-medium text-gray-600">{t('orderDetail.productName')}</th>
                        <th className="text-center p-3 font-medium text-gray-600 w-20">{t('orderDetail.qty')}</th>
                        <th className="text-right p-3 font-medium text-gray-600">{t('orderDetail.unitPrice')}</th>
                        <th className="text-right p-3 font-medium text-gray-600">{t('orderDetail.lineTotal')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(order.items ?? []).map((item, i) => {
                        const imgSrc = productImageSrc(item.product_image)
                        const name = item.product_name ?? t('orderDetail.productFallback')
                        const qty = item.quantity ?? 1
                        const unitPrice = item.price ?? 0
                        const rowSubtotal = item.subtotal ?? unitPrice * qty
                        return (
                          <tr key={i} className="border-b border-gray-100 last:border-0">
                            <td className="p-3">
                              <div className="h-12 w-12 rounded-lg overflow-hidden bg-gray-100">
                                {imgSrc ? (
                                  <Image src={imgSrc} alt={name} width={48} height={48} className="h-full w-full object-cover" unoptimized />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">—</div>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="font-medium text-black">{name}</span>
                              {item.size_name && <span className="text-gray-500 ml-1">({item.size_name})</span>}
                            </td>
                            <td className="p-3 text-center text-gray-800">{qty}</td>
                            <td className="p-3 text-right text-gray-800">{formatPrice(unitPrice)}</td>
                            <td className="p-3 text-right font-medium text-black">{formatPrice(rowSubtotal)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {order.status === 'completed' && (
                <div className="border-t border-gray-100 pt-6 pb-6">
                  <h2
                    className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4"
                    style={{ fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' }}
                  >
                    {t('orderDetail.deliveryProofTitle')}
                  </h2>
                  <div className="max-w-md">
                    <DeliveryProofThumbnail
                      label={t('orderDetail.deliveryProofTitle')}
                      proof={pickLatestProof(order.delivery_proofs, 'delivery_photo')}
                      emptyText={t('orderDetail.noDeliveryProof')}
                    />
                  </div>
                </div>
              )}

              {/* Thanh toán */}
              <div className="border-t border-gray-100 pt-6 pb-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4" style={{ fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' }}>{t('orderDetail.payment')}</h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <dt className="text-gray-500">{t('orderDetail.paymentMethod')}</dt>
                    <dd className="font-medium text-black">{getPaymentMethodLabel(payment?.method, t)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">{t('orderDetail.paymentStatus')}</dt>
                    <dd>
                      <span
                        className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${getPaymentStatusBadgeClass(payment?.status, payment?.method)}`}
                      >
                        {getPaymentStatusLabel(payment?.status, t, payment?.method)}
                      </span>
                    </dd>
                  </div>
                  {payment?.paid_amount != null && payment.paid_amount > 0 && (
                    <div>
                      <dt className="text-gray-500">{t('orderDetail.paidAmount')}</dt>
                      <dd className="font-medium text-black">{formatPrice(payment.paid_amount)}</dd>
                    </div>
                  )}
                  {payment?.transaction_id && (
                    <div>
                      <dt className="text-gray-500">{t('orderDetail.transactionId')}</dt>
                      <dd className="text-gray-800 font-mono text-xs">{payment.transaction_id}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Tổng cộng */}
              <div className="border-t border-gray-100 pt-6 pb-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4" style={{ fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' }}>{t('orderDetail.totals')}</h2>
                <div className="space-y-2 text-sm">
                  {order.shipping_fee != null && order.shipping_fee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('orderDetail.shippingFee')}</span>
                      <span className="text-gray-800">{formatPrice(order.shipping_fee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="font-semibold text-black" style={{ fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' }}>{t('orderDetail.grandTotal')}</span>
                    <span className="text-lg font-bold text-black">{formatPrice(order.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Ghi chú */}
              {order.note && (
                <div className="border-t border-gray-100 pt-6">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2" style={{ fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' }}>{t('orderDetail.note')}</h2>
                  <p className="text-sm text-gray-800">{order.note}</p>
                </div>
              )}

              {/* Shipper (khi có) */}
              {(order.tracking?.shipper_id || shipper) && (
                <div className="border-t border-gray-100 pt-6">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4" style={{ fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' }}>{t('orderDetail.shipperSection')}</h2>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-black">
                        {shipper?.shipper_name ??
                          [order.tracking?.first_name, order.tracking?.last_name].filter(Boolean).join(' ') ??
                          '—'}
                      </p>
                      <p className="text-gray-600">{t('orderDetail.vehicle')}: {shipper?.vehicle_info ?? order.tracking?.vehicle_info ?? '—'}</p>
                      {shipper?.rating != null && <p className="text-gray-600">{t('orderDetail.rating')}: {shipper.rating}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={messengerHref}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                      >
                        <MessageCircle className="h-4 w-4" />
                        {t('orderDetail.chat')}
                      </Link>
                      {(shipper?.phone ?? order.tracking?.phone) && (
                        <a
                          href={`tel:${shipper?.phone ?? order.tracking?.phone}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                        >
                          <Phone className="h-4 w-4" />
                          {t('orderDetail.call')}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  )
}
