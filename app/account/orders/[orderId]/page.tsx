'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowLeft, Phone, MapPin } from 'lucide-react'
import { userOrdersApi } from '@/lib/userOrdersApi'
import type { Shipper, OrderTracking } from '@/lib/tracking-types'
import { ORDER_STATUS_CONFIG } from '@/lib/tracking-types'
import ProtectedRoute from '@/components/protected-route'

const MapboxShipperDetailMapDemo = dynamic(
  () => import('@/components/admin/MapboxShipperDetailMapDemo'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-[70vh] bg-gray-100 flex items-center justify-center rounded-xl">
        Đang tải bản đồ...
      </div>
    ),
  }
)

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
}

function getStatusBadgeClass(status: string | undefined | null): string {
  const s = (status ?? '').toString().toLowerCase()
  if (s === 'pending' || s === 'processing' || s === 'confirmed' || s === 'assigned') return 'bg-amber-100 text-amber-800'
  if (s === 'shipping' || s === 'in_transit' || s === 'picking_up' || s === 'picked_up' || s === 'arriving') return 'bg-blue-100 text-blue-800'
  if (s === 'delivered' || s === 'completed') return 'bg-green-100 text-green-800'
  if (s === 'cancelled' || s === 'failed' || s === 'returned') return 'bg-red-100 text-red-800'
  return 'bg-gray-100 text-gray-800'
}

function getStatusLabel(status: string | undefined | null): string {
  const raw = (status ?? '').toString()
  const key = raw as keyof typeof ORDER_STATUS_CONFIG
  if (key && key in ORDER_STATUS_CONFIG) return ORDER_STATUS_CONFIG[key].label
  return raw || '—'
}

/** Chỉ hiện bản đồ khi đơn đang giao (in_transit, picking_up, picked_up, arriving, shipping). */
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

function getPaymentMethodLabel(method: string | undefined): string {
  if (!method) return '—'
  const m = method.toLowerCase()
  if (m === 'cod' || m === 'cash') return 'Tiền mặt (COD)'
  if (m === 'casso' || m === 'bank_transfer') return 'Chuyển khoản ngân hàng'
  if (m === 'vnpay') return 'VNPay'
  if (m === 'momo') return 'Ví MoMo'
  return method
}

function getPaymentStatusLabel(status: string | undefined): string {
  if (!status) return '—'
  const s = status.toLowerCase()
  if (s === 'pending') return 'Chờ thanh toán'
  if (s === 'confirmed' || s === 'paid') return 'Đã thanh toán'
  if (s === 'failed' || s === 'cancelled') return 'Thất bại / Đã hủy'
  return status
}

export default function OrderDetailPage() {
  const params = useParams()
  const orderId = params?.orderId as string
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [shipper, setShipper] = useState<Shipper | null>(null)
  const [orders, setOrders] = useState<OrderTracking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mapSectionRef = useRef<HTMLElement>(null)

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

  const isDelivering = isDeliveringStatus(order?.status ?? '')
  const hasRealMapData = shipper && orders.length > 0 && orders.some((o) => o.destination_lat && o.destination_lng)
  const showMap = isDelivering
  const DEMO_CENTER_LNG = 106.660172
  const DEMO_CENTER_LAT = 10.762622
  const DEMO_DEST_LNG = 106.67
  const DEMO_DEST_LAT = 10.76
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
  const shippingAddress = order?.shipping_address
  const addressLine = shippingAddress?.address_line ?? ([shippingAddress?.ward, shippingAddress?.district, shippingAddress?.city].filter(Boolean).join(', ') || null)
  const payment = order?.payment

  if (loading) {
    return (
      <ProtectedRoute>
        <main className="min-h-screen bg-[#f9fafb] pt-24 pb-12">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl animate-pulse space-y-4">
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
          <div className="container mx-auto px-4">
            <Link
              href="/account"
              className="inline-flex items-center text-sm text-gray-600 hover:text-black mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại trang tài khoản
            </Link>
            <p className="text-red-600">{error ?? 'Không tìm thấy đơn hàng'}</p>
            <Link
              href="/account"
              className="mt-4 inline-block rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Quay lại trang tài khoản
            </Link>
          </div>
        </main>
      </ProtectedRoute>
    )
  }

  const orderLabel = order.invoice_number ?? `ORD-${order.order_id}`

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f9fafb] pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl space-y-6">
            {/* Header */}
            <header>
              <Link
                href="/account"
                className="inline-flex items-center text-sm text-gray-600 hover:text-black mb-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lại trang tài khoản
              </Link>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-xl font-bold text-black">{orderLabel}</h1>
                <div className="flex items-center gap-2">
                  {showMap && (
                    <button
                      type="button"
                      onClick={() => mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <MapPin className="h-4 w-4" />
                      Xem đơn giao
                    </button>
                  )}
                  <span
                    className={`rounded-xl px-3 py-1 text-xs font-medium ${getStatusBadgeClass(order.status)}`}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                </div>
              </div>
            </header>

            {/* Một khối chi tiết đơn (hóa đơn) */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm overflow-hidden">
              {/* Thông tin đơn hàng */}
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Thông tin đơn hàng</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm mb-5">
                <div>
                  <dt className="text-gray-500">Mã đơn hàng</dt>
                  <dd className="font-medium text-black">#{order.order_id}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Mã hóa đơn</dt>
                  <dd className="font-medium text-black">{orderLabel}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Ngày đặt hàng</dt>
                  <dd className="text-gray-800">{formatDateTime(order.created_at)}</dd>
                </div>
                {order.estimated_delivery_at && (
                  <div>
                    <dt className="text-gray-500">Dự kiến giao</dt>
                    <dd className="text-gray-800">{formatDate(order.estimated_delivery_at)}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-gray-500">Trạng thái</dt>
                  <dd>
                    <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </dd>
                </div>
              </dl>

              {/* Địa chỉ giao hàng */}
              {(addressLine || shippingAddress?.recipient_name || shippingAddress?.phone) && (
                <div className="border-t border-gray-100 pt-5 pb-5">
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Địa chỉ giao hàng</h2>
                    <div className="text-sm space-y-1">
                      {shippingAddress?.recipient_name && (
                        <p className="font-medium text-black">{shippingAddress.recipient_name}</p>
                      )}
                      {shippingAddress?.phone && (
                        <p className="text-gray-700">SĐT: {shippingAddress.phone}</p>
                      )}
                      {addressLine && <p className="text-gray-800">{addressLine}</p>}
                    </div>
                  </div>
              )}

              {/* Sản phẩm */}
              <div className="border-t border-gray-100 pt-5 pb-5">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Sản phẩm</h2>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left p-3 font-medium text-gray-600 w-16">Ảnh</th>
                        <th className="text-left p-3 font-medium text-gray-600">Tên sản phẩm</th>
                        <th className="text-center p-3 font-medium text-gray-600 w-20">SL</th>
                        <th className="text-right p-3 font-medium text-gray-600">Đơn giá</th>
                        <th className="text-right p-3 font-medium text-gray-600">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(order.items ?? []).map((item, i) => {
                        const imgSrc = productImageSrc(item.product_image)
                        const name = item.product_name ?? 'Sản phẩm'
                        const qty = item.quantity ?? 1
                        const unitPrice = item.price ?? 0
                        const subtotal = item.subtotal ?? unitPrice * qty
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
                            <td className="p-3 text-right font-medium text-black">{formatPrice(subtotal)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Thanh toán */}
              <div className="border-t border-gray-100 pt-5 pb-5">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Thanh toán</h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <dt className="text-gray-500">Hình thức</dt>
                    <dd className="font-medium text-black">{getPaymentMethodLabel(payment?.method)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Trạng thái thanh toán</dt>
                    <dd>{getPaymentStatusLabel(payment?.status)}</dd>
                  </div>
                  {payment?.paid_amount != null && payment.paid_amount > 0 && (
                    <div>
                      <dt className="text-gray-500">Số tiền thanh toán</dt>
                      <dd className="font-medium text-black">{formatPrice(payment.paid_amount)}</dd>
                    </div>
                  )}
                  {payment?.transaction_id && (
                    <div>
                      <dt className="text-gray-500">Mã giao dịch</dt>
                      <dd className="text-gray-800 font-mono text-xs">{payment.transaction_id}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Tổng cộng */}
              <div className="border-t border-gray-100 pt-5 pb-5">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Tổng cộng</h2>
                <div className="space-y-2 text-sm">
                  {order.shipping_fee != null && order.shipping_fee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phí vận chuyển</span>
                      <span className="text-gray-800">{formatPrice(order.shipping_fee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="font-semibold text-black">Tổng thanh toán</span>
                    <span className="text-lg font-bold text-black">{formatPrice(order.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Ghi chú */}
              {order.note && (
                <div className="border-t border-gray-100 pt-5">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Ghi chú</h2>
                  <p className="text-sm text-gray-800">{order.note}</p>
                </div>
              )}

              {/* Shipper (khi có) */}
              {(order.tracking?.shipper_id || shipper) && (
                <div className="border-t border-gray-100 pt-5">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Shipper giao hàng</h2>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-black">
                        {shipper?.shipper_name ??
                          [order.tracking?.first_name, order.tracking?.last_name].filter(Boolean).join(' ') ??
                          '—'}
                      </p>
                      <p className="text-gray-600">Xe: {shipper?.vehicle_info ?? order.tracking?.vehicle_info ?? '—'}</p>
                      {shipper?.rating != null && <p className="text-gray-600">Đánh giá: {shipper.rating}</p>}
                    </div>
                    {(shipper?.phone ?? order.tracking?.phone) && (
                      <a
                        href={`tel:${shipper?.phone ?? order.tracking?.phone}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                      >
                        <Phone className="h-4 w-4" />
                        Gọi điện
                      </a>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Bản đồ demo – hiện khi đơn đang giao (dữ liệu thật hoặc demo) */}
            {showMap && (
              <section ref={mapSectionRef} className="w-full min-h-[70vh] rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 p-4">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Theo dõi đơn hàng
                  </h2>
                  {!hasRealMapData && (
                    <span className="text-xs text-amber-600 font-medium">Demo – vị trí mẫu</span>
                  )}
                </div>
                <MapboxShipperDetailMapDemo
                  shipper={mapShipper}
                  orders={mapOrders}
                  className="w-full min-h-[70vh]"
                />
              </section>
            )}
          </div>
        </div>
      </main>
    </ProtectedRoute>
  )
}
