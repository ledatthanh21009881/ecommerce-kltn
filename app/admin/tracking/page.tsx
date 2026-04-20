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

/** Đơn đang trong luồng giao (có shipper). */
const DELIVERY_STATUSES = new Set([
  'assigned',
  'picking_up',
  'picked_up',
  'in_transit',
  'arriving',
])

// Mock data for development
const mockStats: TrackingStats = {
  total_orders_today: 45,
  active_deliveries: 12,
  completed_today: 28,
  pending_pickup: 5,
  failed_deliveries: 2,
  avg_delivery_time: 35.5,
  total_revenue_today: 12500000,
  active_shippers: 8,
  date_range: {
    from: '2025-10-28',
    to: '2025-10-28'
  }
}

const mockOrders: OrderTracking[] = [
  {
    order_id: 1,
    status: 'in_transit',
    total_amount: 450000,
    created_at: '2025-10-28 14:30:00',
    estimated_delivery_at: '2025-10-28 15:30:00',
    customer_id: 101,
    customer_name: 'Nguyễn Văn A',
    customer_phone: '0901234567',
    customer_address: '123 Nguyễn Huệ, Q1, TP.HCM',
    shipper_id: 4,
    shipper_name: 'Trần Thị B',
    shipper_phone: '0987654321',
    vehicle_info: 'Honda Wave',
    rating: 4.8,
    current_lat: 10.762622,
    current_lng: 106.660172,
    destination_lat: 10.776000,
    destination_lng: 106.678000,
    location_updated_at: '2025-10-28 14:45:00',
    event_count: 5,
    last_status: 'in_transit',
    last_event_at: '2025-10-28 14:45:00'
  },
  {
    order_id: 2,
    status: 'picking_up',
    total_amount: 320000,
    created_at: '2025-10-28 13:15:00',
    estimated_delivery_at: '2025-10-28 14:15:00',
    customer_id: 102,
    customer_name: 'Lê Văn C',
    customer_phone: '0912345678',
    customer_address: '456 Lê Lợi, Q3, TP.HCM',
    shipper_id: 5,
    shipper_name: 'Phạm Thị D',
    shipper_phone: '0976543210',
    vehicle_info: 'Yamaha Grande',
    rating: 4.5,
    current_lat: 10.775000,
    current_lng: 106.675000,
    destination_lat: 10.780000,
    destination_lng: 106.682000,
    location_updated_at: '2025-10-28 14:40:00',
    event_count: 3,
    last_status: 'picking_up',
    last_event_at: '2025-10-28 14:40:00'
  }
]

const mockShippers = [
  {
    user_id: 4,
    shipper_name: 'Trần Thị B',
    phone: '0987654321',
    vehicle_info: 'Honda Wave',
    rating: 4.8,
    on_time_delivery_pct: 95.5,
    total_delivered: 150,
    is_available: false,
    status: 'active' as const,
    created_at: '2025-01-15 10:00:00',
    current_lat: 10.762622,
    current_lng: 106.660172,
    location_updated_at: '2025-10-28 14:45:00',
    active_orders_count: 1
  },
  {
    user_id: 5,
    shipper_name: 'Phạm Thị D',
    phone: '0976543210',
    vehicle_info: 'Yamaha Grande',
    rating: 4.5,
    on_time_delivery_pct: 92.0,
    total_delivered: 120,
    is_available: false,
    status: 'active' as const,
    created_at: '2025-02-20 10:00:00',
    current_lat: 10.775000,
    current_lng: 106.675000,
    location_updated_at: '2025-10-28 14:40:00',
    active_orders_count: 1
  },
  {
    user_id: 6,
    shipper_name: 'Hoàng Văn E',
    phone: '0965432109',
    vehicle_info: 'Honda Lead',
    rating: 4.9,
    on_time_delivery_pct: 98.0,
    total_delivered: 200,
    is_available: true,
    status: 'active' as const,
    created_at: '2025-03-10 10:00:00',
    current_lat: 10.750000,
    current_lng: 106.650000,
    location_updated_at: '2025-10-28 14:50:00',
    active_orders_count: 0
  }
]

export default function OrderTrackingPage() {
  const router = useRouter()
  const { t } = useLanguage()
  // State management - áp dụng error prevention patterns từ Loi_thuong_gap.md
  const [orders, setOrders] = useState<OrderTracking[]>([])
  const [shippers, setShippers] = useState<Shipper[]>(mockShippers as Shipper[])
  const [stats, setStats] = useState<TrackingStats>(mockStats)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Filters and search
  const [filters, setFilters] = useState<OrderFilters>({
    status: 'all',
    search: '',
    page: 1,
    limit: 20
  })
  
  // UI state
  const [activeTab, setActiveTab] = useState('overview')
  const [warned, setWarned] = useState(false)
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
        // Gracefully handle missing token in dev
        setError('Missing authentication token')
        setOrders(mockOrders)
        return
      }

      const queryParams = new URLSearchParams()
      if (filters.status && filters.status !== 'all') queryParams.append('status', filters.status)
      if (filters.search) queryParams.append('search', filters.search)
      if (filters.page) queryParams.append('page', filters.page.toString())
      if (filters.limit) queryParams.append('limit', filters.limit.toString())

      const { ok, status, data } = await fetchJsonSafe(`api/backend/v1/tracking/orders?${queryParams}`)

      if (ok && data?.success) {
        const ordersData = ensureArray<OrderTracking>(data.data?.orders || [])
        setOrders(ordersData)
        if (warned) setWarned(false)
        return
      }

      if (ok && !data?.success) {
        // Không coi là lỗi: dùng data rỗng nếu có, hoặc demo nếu thiếu
        const ordersData = ensureArray<OrderTracking>(data?.data?.orders || [])
        setOrders(ordersData.length ? ordersData : mockOrders)
        return
      }

      if (!ok || (status && status >= 500)) {
        if (!warned) {
          toast.warning('Orders API lỗi - đang hiển thị dữ liệu demo')
          setWarned(true)
        }
        setError(null)
        setOrders(mockOrders)
      }
    } catch (err) {
      console.error('Error fetching orders:', err)
      toast.warning('Network error - showing demo data')
      setError(null)
      // Fallback to mock data for development
      setOrders(mockOrders)
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

  // Initial data fetch (no interval — tránh lag; admin bấm Làm mới khi cần)
  useEffect(() => {
    fetchOrders()
    fetchStats()
    fetchShippers()
  }, [fetchOrders, fetchStats, fetchShippers])

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

  const getStatusConfig = (status: string) => {
    const normalized = status.toLowerCase()
    const base =
      ORDER_STATUS_CONFIG[status as keyof typeof ORDER_STATUS_CONFIG] || {
        label: status,
        color: 'bg-gray-100 text-gray-800',
        icon: '❓',
      }

    // Tracking UX: nhãn ngắn gọn + tương phản mạnh + icon xe máy cho luồng giao hàng
    if (normalized === 'in_transit') {
      return {
        ...base,
        label: t('trackingStatusShortInTransit'),
        color: 'bg-blue-600 text-white hover:bg-blue-600',
        icon: 'delivery',
      }
    }
    if (normalized === 'picking_up') {
      return {
        ...base,
        label: t('trackingStatusShortPickingUp'),
        color: 'bg-amber-600 text-white hover:bg-amber-600',
        icon: 'delivery',
      }
    }
    if (['assigned', 'picked_up', 'arriving'].includes(normalized)) {
      return {
        ...base,
        icon: '🛵',
      }
    }

    return base
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
                <SelectItem value="confirmed">{t('trackingStatusConfirmed')}</SelectItem>
                <SelectItem value="assigned">{t('trackingStatusAssigned')}</SelectItem>
                <SelectItem value="picking_up">{t('trackingStatusPickingUp')}</SelectItem>
                <SelectItem value="picked_up">{t('trackingStatusPickedUp')}</SelectItem>
                <SelectItem value="in_transit">{t('trackingStatusInTransit')}</SelectItem>
                <SelectItem value="arriving">{t('trackingStatusArriving')}</SelectItem>
                <SelectItem value="delivered">{t('trackingStatusDelivered')}</SelectItem>
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
                              <Badge className={`${statusConfig.color} whitespace-nowrap px-2.5 py-1`}>
                                {statusConfig.icon === 'delivery' ? (
                                  <Image
                                    src={deliveryIcon}
                                    alt=""
                                    className="mr-1 inline-block h-4 w-4 align-middle"
                                  />
                                ) : (
                                  <span className="mr-1">{statusConfig.icon}</span>
                                )}
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {order.current_lat != null && order.current_lng != null ? (
                                <div className="flex items-center gap-1 whitespace-nowrap">
                                  <MapPin className="h-3 w-3 shrink-0 text-green-600" />
                                  <span className="text-xs font-mono whitespace-nowrap">
                                    {order.current_lat.toFixed(4)}, {order.current_lng.toFixed(4)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-500">{t('trackingNoLocation')}</span>
                              )}
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
                            {shipper.rating?.toFixed(1) || t('trackingNoRating')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={shipper.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {shipper.is_available ? t('trackingShipperAvailable') : t('trackingShipperBusy')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {shipper.current_lat && shipper.current_lng ? (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-blue-600" />
                              <span className="text-xs">
                                {shipper.current_lat.toFixed(4)}, {shipper.current_lng.toFixed(4)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500">{t('trackingNoLocation')}</span>
                          )}
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