'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import deliveryIcon from '../../../delivery.png'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  RefreshCw,
  MapPin,
  Truck,
  Package,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Eye,
  Phone,
  Star,
  Route,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { 
  OrderTracking, 
  TrackingStats, 
  OrderFilters, 
  ORDER_STATUS_CONFIG,
  ensureArray,
  Shipper
} from '@/lib/tracking-types'
import { authUtils } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { fetchJsonSafe } from '@/lib/api'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { AdminPageHeading } from '@/components/admin/AdminPageHeading'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const TrackingOrderRoutePreview = dynamic(
  () => import('@/components/admin/TrackingOrderRoutePreview'),
  {
    ssr: false,
    loading: () => <div className="h-[360px] animate-pulse rounded-xl bg-slate-100" />,
  }
)

/** MySQL DECIMAL / JSON thường là string — cần ép số trước .toFixed */
function formatShipperRating(rating: unknown): string | null {
  if (rating == null || rating === '') return null
  const n = typeof rating === 'number' ? rating : Number(rating)
  return Number.isFinite(n) ? n.toFixed(1) : null
}

function formatCoordPair(lat: unknown, lng: unknown, decimals: number): string | null {
  if (lat == null || lat === '' || lng == null || lng === '') return null
  const a = typeof lat === 'number' ? lat : Number(lat)
  const b = typeof lng === 'number' ? lng : Number(lng)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  return `${a.toFixed(decimals)}, ${b.toFixed(decimals)}`
}

function toTimestamp(value: string | null | undefined): number {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function dedupeOrdersById(rows: OrderTracking[]): OrderTracking[] {
  const byId = new Map<number, OrderTracking>()
  for (const row of rows) {
    const existing = byId.get(row.order_id)
    if (!existing) {
      byId.set(row.order_id, row)
      continue
    }

    // Keep the freshest row to avoid duplicate keys + stale shipper/location data.
    const existingTime = Math.max(
      toTimestamp(existing.location_updated_at),
      toTimestamp(existing.last_event_at),
      toTimestamp(existing.created_at),
    )
    const currentTime = Math.max(
      toTimestamp(row.location_updated_at),
      toTimestamp(row.last_event_at),
      toTimestamp(row.created_at),
    )

    if (currentTime >= existingTime) {
      byId.set(row.order_id, row)
    }
  }
  return Array.from(byId.values())
}

/** Admin tracking chỉ hiển thị đơn đã vào trạng thái vận chuyển. */
const DELIVERY_STATUSES = new Set(['shipping'])

const EMPTY_STATS: TrackingStats = {
  total_orders_today: 0,
  active_deliveries: 0,
  completed_today: 0,
  pending_pickup: 0,
  failed_deliveries: 0,
  avg_delivery_time: 0,
  total_revenue_today: 0,
  active_shippers: 0,
  date_range: {
    from: '',
    to: '',
  },
}

export default function OrderTrackingPage() {
  const router = useRouter()
  const { t } = useLanguage()
  // State management - áp dụng error prevention patterns từ Loi_thuong_gap.md
  const [orders, setOrders] = useState<OrderTracking[]>([])
  const [shippers, setShippers] = useState<Shipper[]>([])
  const [stats, setStats] = useState<TrackingStats>(EMPTY_STATS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orderPagination, setOrderPagination] = useState<{
    page: number
    limit: number
    total: number
    total_pages: number
  } | null>(null)
  
  // Filters and search
  const [filters, setFilters] = useState<OrderFilters>({
    status: 'all',
    search: '',
    page: 1,
    limit: 20
  })
  
  // UI state
  const [activeTab, setActiveTab] = useState('overview')
  const [routeModal, setRouteModal] = useState<{
    open: boolean
    shipperName: string
    shipperId: number | null
    orders: OrderTracking[]
    selectedOrderId: number | null
  }>({
    open: false,
    shipperName: '',
    shipperId: null,
    orders: [],
    selectedOrderId: null,
  })

  /** Số đơn “đang giao” theo từng shipper (cùng logic bảng shipper cũ). */
  const shipperActiveDeliveryCount = useMemo(() => {
    const m = new Map<number, number>()
    for (const o of ensureArray<OrderTracking>(orders)) {
      if (!o.shipper_id || !DELIVERY_STATUSES.has(o.status)) continue
      m.set(o.shipper_id, (m.get(o.shipper_id) ?? 0) + 1)
    }
    return m
  }, [orders])

  // Fetch data functions
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = authUtils.getToken()
      if (!token) {
        setError('Missing authentication token')
        setOrders([])
        setOrderPagination(null)
        return
      }

      const queryParams = new URLSearchParams()
      if (filters.status && filters.status !== 'all') queryParams.append('status', filters.status)
      if (filters.search) queryParams.append('search', filters.search)
      if (filters.page) queryParams.append('page', filters.page.toString())
      if (filters.limit) queryParams.append('limit', filters.limit.toString())

      const { ok, status, data } = await fetchJsonSafe(`api/backend/v1/tracking/orders?${queryParams}`)

      if (ok && data?.success) {
        const payload = data.data as {
          orders?: OrderTracking[]
          pagination?: { page?: number; limit?: number; total?: number; total_pages?: number }
        }
        const ordersData = dedupeOrdersById(ensureArray<OrderTracking>(payload?.orders || []))
        setOrders(ordersData)
        const p = payload?.pagination
        if (p && typeof p.total === 'number') {
          const lim = Math.max(1, p.limit ?? filters.limit ?? 20)
          const totPages =
            typeof p.total_pages === 'number' && p.total_pages >= 0
              ? p.total_pages
              : Math.ceil(p.total / lim)
          setOrderPagination({
            page: p.page ?? filters.page ?? 1,
            limit: lim,
            total: p.total,
            total_pages: Math.max(1, totPages),
          })
        } else {
          setOrderPagination(null)
        }
        return
      }

      const apiMessage = data?.message || `Orders API failed (status ${status ?? 'unknown'})`
      setError(apiMessage)
      setOrders([])
      setOrderPagination(null)
    } catch (err) {
      console.error('Error fetching orders:', err)
      toast.error('Network error - cannot load tracking orders')
      setError('Network error while loading tracking orders')
      setOrders([])
      setOrderPagination(null)
    } finally {
      setLoading(false)
    }
  }, [filters])

  const fetchStats = useCallback(async () => {
    try {
      const token = authUtils.getToken()
      if (!token) return

      const { ok, data } = await fetchJsonSafe('api/backend/v1/tracking/stats')
      if (ok && data?.success) setStats(data.data)
    } catch (err) {
      console.error('Error fetching stats:', err)
      // Keep mock stats for development
    }
  }, [])

  const fetchShippers = useCallback(async () => {
    try {
      const token = authUtils.getToken()
      if (!token) return

      const { ok, data } = await fetchJsonSafe('api/backend/v1/shippers')
      if (ok && data?.success) {
        const shippersData = ensureArray<Shipper>(data.data?.shippers || [])
        setShippers(shippersData)
      }
    } catch (err) {
      console.error('Error fetching shippers:', err)
      // Keep mock shippers for development
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchOrders()
    fetchStats()
    fetchShippers()
  }, [fetchOrders, fetchStats, fetchShippers])

  // Intentionally no background polling on list page.
  // Realtime GPS polling only runs on the shipper detail page to reduce load.

  // Event handlers
  const handleFilterChange = (key: keyof OrderFilters, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }))
  }

  const handleSearch = (searchTerm: string) => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm,
      page: 1
    }))
  }

  const handleRefresh = () => {
    fetchOrders()
    fetchStats()
    fetchShippers()
    toast.success('Data refreshed')
  }

  const handleShipperSelect = (shipperId: number) => {
    router.push(`/admin/tracking/shipper/${shipperId}`)
  }

  const openRouteModalForOrder = (order: OrderTracking) => {
    if (!order.shipper_id) {
      toast.error('Đơn hàng chưa được gán shipper')
      return
    }
    const group = ensureArray<OrderTracking>(orders).filter(
      (o) => o.shipper_id === order.shipper_id && DELIVERY_STATUSES.has(o.status)
    )
    const list = group.length ? group : [order]
    const withCoords = list.find(
      (o) =>
        o.current_lat != null &&
        o.current_lng != null &&
        o.destination_lat != null &&
        o.destination_lng != null
    )
    const defaultId = withCoords?.order_id ?? list[0]?.order_id ?? null
    setRouteModal({
      open: true,
      shipperName: order.shipper_name || t('trackingShipperCol'),
      shipperId: order.shipper_id,
      orders: list,
      selectedOrderId: defaultId,
    })
  }

  const openMessengerForOrderCustomer = (order: OrderTracking) => {
    const cid = order.customer_id
    if (cid == null || Number.isNaN(Number(cid))) {
      toast.error(t('trackingNoCustomerForChat'))
      return
    }
    const returnTo = encodeURIComponent('/admin/tracking')
    router.push(`/admin/messenger?customer_id=${Number(cid)}&returnTo=${returnTo}`)
  }

  const selectedRouteOrder =
    routeModal.orders.find((o) => o.order_id === routeModal.selectedOrderId) ??
    routeModal.orders[0] ??
    null

  /** Badge giống promotions (Hoạt động): nền xanh nhạt, chữ xanh đậm, có viền — không dùng emoji ❓ */
  const TRACKING_BADGE_COMPLETED = 'border-green-200 bg-green-100 text-green-800 hover:bg-green-100'

  const getStatusConfig = (status: string) => {
    const normalized = (status || '').toLowerCase()

    if (normalized === 'shipping') {
      return {
        label: t('trackingStatusShortInTransit'),
        color: 'border-transparent bg-blue-600 text-white hover:bg-blue-600',
        icon: 'delivery' as const,
      }
    }

    if (normalized === 'completed') {
      return {
        label: t('trackingStatCompleted'),
        color: TRACKING_BADGE_COMPLETED,
        icon: 'none' as const,
      }
    }

    if (normalized === 'processing') {
      return {
        label: t('trackingStatusConfirmed'),
        color: 'border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-50',
        icon: 'none' as const,
      }
    }

    if (normalized === 'pending') {
      return {
        label: t('trackingStatusPending'),
        color: 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-50',
        icon: 'none' as const,
      }
    }

    if (normalized === 'cancelled') {
      return {
        label: t('trackingStatusCancelled'),
        color: 'border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-100',
        icon: 'none' as const,
      }
    }

    if (normalized === 'returned') {
      return {
        label: t('returned'),
        color: 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-50',
        icon: 'none' as const,
      }
    }

    const mapped = ORDER_STATUS_CONFIG[normalized as keyof typeof ORDER_STATUS_CONFIG]
    if (mapped) {
      return {
        label: mapped.label,
        color: 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-50',
        icon: 'none' as const,
      }
    }

    return {
      label: status || '—',
      color: 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-50',
      icon: 'none' as const,
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="space-y-6 max-w-7xl mx-auto">
      <AdminPageHeading
        title={t('orderTrackingPageTitle')}
        description={t('orderTrackingPageSubtitle')}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
          <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-sky-500/15 to-transparent" />
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">{t('trackingStatTotalToday')}</CardTitle>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-700">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight text-slate-900">{stats.total_orders_today}</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
          <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-orange-500/15 to-transparent" />
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">{t('trackingStatActive')}</CardTitle>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-700">
              <Truck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight text-slate-900">{stats.active_deliveries}</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
          <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-500/15 to-transparent" />
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">{t('trackingStatCompleted')}</CardTitle>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700">
              <CheckCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight text-slate-900">{stats.completed_today}</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
          <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-amber-500/15 to-transparent" />
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">{t('trackingStatPending')}</CardTitle>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight text-slate-900">{stats.pending_pickup}</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
          <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-rose-500/15 to-transparent" />
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">{t('trackingStatFailed')}</CardTitle>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-700">
              <XCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight text-slate-900">{stats.failed_deliveries}</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
          <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-500/15 to-transparent" />
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">{t('trackingStatShippers')}</CardTitle>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-700">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight text-slate-900">{stats.active_shippers}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={t('trackingSearchPlaceholder')}
                  value={filters.search || ''}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder={t('trackingFilterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('trackingStatusAll')}</SelectItem>
                <SelectItem value="pending">{t('trackingStatusPending')}</SelectItem>
                <SelectItem value="processing">{t('trackingStatusConfirmed')}</SelectItem>
                <SelectItem value="shipping">{t('trackingStatusInTransit')}</SelectItem>
                <SelectItem value="delivered">{t('trackingStatusDelivered')}</SelectItem>
                <SelectItem value="completed">{t('trackingStatCompleted')}</SelectItem>
                <SelectItem value="failed">{t('trackingStatusFailed')}</SelectItem>
                <SelectItem value="cancelled">{t('trackingStatusCancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="overview">{t('trackingTabOverview')}</TabsTrigger>
          <TabsTrigger value="shippers">{t('trackingTabShippers')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="border-violet-200/80 bg-white/90 shadow-sm">
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('trackingOrderCol')}</TableHead>
                      <TableHead>{t('trackingCustomerCol')}</TableHead>
                      <TableHead>{t('trackingShipperCol')}</TableHead>
                      <TableHead>{t('trackingVehicleCol')}</TableHead>
                      <TableHead className="w-[140px] min-w-[140px]">{t('trackingStatusCol')}</TableHead>
                      <TableHead>{t('trackingLocationCol')}</TableHead>
                      <TableHead className="text-center whitespace-nowrap">
                        {t('trackingActiveOrdersCount')}
                      </TableHead>
                      <TableHead>{t('trackingAmountCol')}</TableHead>
                      <TableHead>{t('trackingUpdatedCol')}</TableHead>
                      <TableHead className="w-[132px]">{t('trackingActionsCol')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8">
                          <div className="flex items-center justify-center">
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                            {t('trackingLoadingOrders')}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : error ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-red-600">
                          {error}
                        </TableCell>
                      </TableRow>
                    ) : ensureArray(orders).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                          {t('trackingNoOrders')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      ensureArray<OrderTracking>(orders).map((order: OrderTracking) => {
                        const statusConfig = getStatusConfig(order.status)
                        const shipperCount =
                          order.shipper_id != null
                            ? shipperActiveDeliveryCount.get(order.shipper_id) ?? 0
                            : 0
                        return (
                          <TableRow key={order.order_id}>
                            <TableCell className="font-medium whitespace-nowrap">
                              #{order.order_id}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{order.customer_name}</div>
                                <div className="text-sm text-gray-500">{order.customer_phone}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {order.shipper_name ? (
                                <div>
                                  <div className="font-medium">{order.shipper_name}</div>
                                  <div className="text-sm text-gray-500">{order.shipper_phone}</div>
                                </div>
                              ) : (
                                <span className="text-gray-500">{t('trackingNotAssigned')}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600 max-w-[140px]">
                              {order.vehicle_info || '—'}
                            </TableCell>
                            <TableCell className="min-w-[140px]">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'whitespace-nowrap px-2.5 py-1 font-medium',
                                  statusConfig.color,
                                )}
                              >
                                {statusConfig.icon === 'delivery' ? (
                                  <Image
                                    src={deliveryIcon}
                                    alt=""
                                    className="mr-1 inline-block h-4 w-4 align-middle"
                                  />
                                ) : null}
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const pos = formatCoordPair(order.current_lat, order.current_lng, 4)
                                return pos ? (
                                <div className="flex items-center gap-1 whitespace-nowrap">
                                  <MapPin className="h-3 w-3 shrink-0 text-green-600" />
                                  <span className="text-xs font-mono whitespace-nowrap">
                                    {pos}
                                  </span>
                                </div>
                                ) : (
                                <span className="text-gray-500">{t('trackingNoLocation')}</span>
                                )
                              })()}
                            </TableCell>
                            <TableCell className="text-center">
                              {order.shipper_id != null && DELIVERY_STATUSES.has(order.status) ? (
                                <Badge variant="secondary" className="font-mono">
                                  {shipperCount}
                                </Badge>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </TableCell>
                            <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {formatTime(order.last_event_at || order.created_at)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  title={t('trackingViewRoute')}
                                  onClick={() => openRouteModalForOrder(order)}
                                >
                                  <Route className="h-3 w-3" />
                                </Button>
                                {order.shipper_phone ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    title={t('trackingCallShipper')}
                                    onClick={() => window.open(`tel:${order.shipper_phone}`)}
                                  >
                                    <Phone className="h-3 w-3" />
                                  </Button>
                                ) : null}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  title={t('trackingMessageCustomer')}
                                  onClick={() => openMessengerForOrderCustomer(order)}
                                >
                                  <MessageSquare className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {!loading && orderPagination && orderPagination.total_pages > 1 && (
            <Card className="border-violet-200/80 bg-white/90 shadow-sm">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                <p className="text-sm text-slate-600">
                  {t('showingXOfY', {
                    from: String(
                      orderPagination.total === 0
                        ? 0
                        : (orderPagination.page - 1) * orderPagination.limit + 1,
                    ),
                    to: String(
                      Math.min(
                        orderPagination.page * orderPagination.limit,
                        orderPagination.total,
                      ),
                    ),
                    total: String(orderPagination.total),
                  })}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={orderPagination.page <= 1}
                    className="border-slate-200 bg-white/80 hover:bg-white"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        page: Math.max(1, (prev.page ?? 1) - 1),
                      }))
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[120px] text-center text-sm font-medium text-slate-700">
                    {t('pageOf', {
                      current: String(orderPagination.page),
                      total: String(orderPagination.total_pages),
                    })}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={orderPagination.page >= orderPagination.total_pages}
                    className="border-slate-200 bg-white/80 hover:bg-white"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        page: Math.min(
                          orderPagination.total_pages,
                          (prev.page ?? 1) + 1,
                        ),
                      }))
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="shippers" className="space-y-4">
          <Card>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('trackingShipperCol')}</TableHead>
                      <TableHead>{t('trackingVehicleCol')}</TableHead>
                      <TableHead>{t('trackingRatingCol')}</TableHead>
                      <TableHead>{t('trackingStatusCol')}</TableHead>
                      <TableHead>{t('trackingLocationCol')}</TableHead>
                      <TableHead>{t('trackingActiveOrdersCount')}</TableHead>
                      <TableHead>{t('trackingActionsCol')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ensureArray<Shipper>(shippers).map((shipper: Shipper) => (
                      <TableRow key={shipper.user_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{shipper.shipper_name}</div>
                            <div className="text-sm text-gray-500">{shipper.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>{shipper.vehicle_info}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500" />
                            {formatShipperRating(shipper.rating) ?? t('trackingNoRating')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              shipper.is_available
                                ? 'border-green-200 bg-green-50 text-green-800 hover:bg-green-50'
                                : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-50'
                            }
                          >
                            {shipper.is_available ? t('trackingShipperAvailable') : t('trackingShipperBusy')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const pos = formatCoordPair(shipper.current_lat, shipper.current_lng, 4)
                            return pos ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-blue-600" />
                              <span className="text-xs">{pos}</span>
                            </div>
                            ) : (
                            <span className="text-gray-500">{t('trackingNoLocation')}</span>
                            )
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {shipper.active_orders_count}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleShipperSelect(shipper.user_id)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`tel:${shipper.phone}`)}
                            >
                              <Phone className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={routeModal.open}
        onOpenChange={(open) => setRouteModal((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t('trackingRouteTitle')}
              {routeModal.shipperName ? ` — ${routeModal.shipperName}` : ''}
            </DialogTitle>
            <DialogDescription>{t('trackingRouteDialogDesc')}</DialogDescription>
          </DialogHeader>
          <div className="mt-2 grid gap-4 lg:grid-cols-[1fr_minmax(0,240px)]">
            <TrackingOrderRoutePreview order={selectedRouteOrder} />
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('trackingOrdersInRoute')}
              </p>
              <div className="max-h-[340px] space-y-1.5 overflow-y-auto pr-1">
                {routeModal.orders.map((o) => (
                  <button
                    key={o.order_id}
                    type="button"
                    onClick={() =>
                      setRouteModal((prev) => ({ ...prev, selectedOrderId: o.order_id }))
                    }
                    className={cn(
                      'w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
                      routeModal.selectedOrderId === o.order_id
                        ? 'border-violet-500 bg-violet-50 text-violet-950'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    <span className="font-semibold">#{o.order_id}</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-600">{o.customer_name}</span>
                    <Badge variant="outline" className="mt-1.5 text-[10px]">
                      {getStatusConfig(o.status).label}
                    </Badge>
                  </button>
                ))}
              </div>
              {routeModal.shipperId != null && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-auto shrink-0"
                  onClick={() => {
                    const id = routeModal.shipperId
                    setRouteModal((p) => ({ ...p, open: false }))
                    if (id != null) handleShipperSelect(id)
                  }}
                >
                  {t('trackingShipperFullPage')}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}