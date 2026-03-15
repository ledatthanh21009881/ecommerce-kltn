'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Filter, 
  RefreshCw, 
  MapPin, 
  Truck, 
  Package, 
  Clock, 
  DollarSign,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Phone,
  MessageSquare,
  Star,
  X
} from 'lucide-react'
import { 
  OrderTracking, 
  TrackingStats, 
  OrderFilters, 
  ORDER_STATUS_CONFIG,
  ensureArray,
  getNestedValue,
  Shipper
} from '@/lib/tracking-types'
import TrackingMap, { MapLegend, MapStats } from '@/components/admin/TrackingMap'
import { authUtils } from '@/lib/auth'
import { fetchJsonSafe } from '@/lib/api'
import { toast } from 'sonner'

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
  const [selectedOrderId, setSelectedOrderId] = useState<number | undefined>()
  const [activeTab, setActiveTab] = useState('overview')
  const [warned, setWarned] = useState(false)

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

  // Initial data fetch
  useEffect(() => {
    fetchOrders()
    fetchStats()
    fetchShippers()
  }, [fetchOrders, fetchStats, fetchShippers])

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders()
      fetchStats()
      fetchShippers()
    }, 5000)

    return () => clearInterval(interval)
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

  const handleOrderSelect = (orderId: number) => {
    setSelectedOrderId(orderId)
    setActiveTab('map')
  }

  const handleShipperSelect = (shipperId: number) => {
    router.push(`/admin/tracking/shipper/${shipperId}`)
  }

  const getStatusConfig = (status: string) => {
    return ORDER_STATUS_CONFIG[status as keyof typeof ORDER_STATUS_CONFIG] || {
      label: status,
      color: 'bg-gray-100 text-gray-800',
      icon: '❓'
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 bg-clip-text text-transparent">Order Tracking</h1>
          <p className="text-slate-600">Real-time order tracking and shipper management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total_orders_today}</p>
                <p className="text-sm text-slate-600">Total Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Truck className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{stats.active_deliveries}</p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.completed_today}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{stats.pending_pickup}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{stats.failed_deliveries}</p>
                <p className="text-sm text-gray-600">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{stats.avg_delivery_time}m</p>
                <p className="text-sm text-gray-600">Avg Time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.total_revenue_today)}</p>
                <p className="text-sm text-gray-600">Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="text-2xl font-bold">{stats.active_shippers}</p>
                <p className="text-sm text-gray-600">Shippers</p>
              </div>
            </div>
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
                  placeholder="Search orders, customers, shippers..."
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
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="picking_up">Picking Up</SelectItem>
                <SelectItem value="picked_up">Picked Up</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="arriving">Arriving</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
          <TabsTrigger value="shippers">Shippers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>Active Orders</CardTitle>
              <CardDescription>
                Real-time tracking of all active orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Shipper</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex items-center justify-center">
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                            Loading orders...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : error ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-red-600">
                          {error}
                        </TableCell>
                      </TableRow>
                    ) : ensureArray(orders).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          No orders found
                        </TableCell>
                      </TableRow>
                    ) : (
                      ensureArray<OrderTracking>(orders).map((order: OrderTracking) => {
                        const statusConfig = getStatusConfig(order.status)
                        return (
                          <TableRow key={order.order_id}>
                            <TableCell className="font-medium">
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
                                <span className="text-gray-500">Not assigned</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={statusConfig.color}>
                                {statusConfig.icon} {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatCurrency(order.total_amount)}
                            </TableCell>
                            <TableCell>
                              {order.current_lat && order.current_lng ? (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-green-600" />
                                  <span className="text-xs">
                                    {order.current_lat.toFixed(4)}, {order.current_lng.toFixed(4)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-500">No location</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {formatTime(order.last_event_at || order.created_at)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (order.shipper_id) {
                                      handleShipperSelect(order.shipper_id)
                                    } else {
                                      toast.error('Đơn hàng chưa được gán shipper')
                                    }
                                  }}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                {order.shipper_phone && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(`tel:${order.shipper_phone}`)}
                                  >
                                    <Phone className="h-3 w-3" />
                                  </Button>
                                )}
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

        <TabsContent value="map" className="space-y-4" forceMount>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Live Tracking Map</CardTitle>
                  <CardDescription>
                    Fleet overview - Real-time location of all shippers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TrackingMap
                    orders={ensureArray(orders)}
                    shippers={ensureArray(shippers)}
                    selectedOrderId={selectedOrderId}
                    onOrderSelect={handleOrderSelect}
                    onShipperSelect={handleShipperSelect}
                    className="h-96"
                  />
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <MapLegend />
              <MapStats orders={ensureArray(orders)} shippers={ensureArray(shippers)} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="shippers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shipper Management</CardTitle>
              <CardDescription>
                Monitor shipper performance and availability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shipper</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Active Orders</TableHead>
                      <TableHead>Actions</TableHead>
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
                            {shipper.rating?.toFixed(1) || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={shipper.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {shipper.is_available ? 'Available' : 'Busy'}
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
                            <span className="text-gray-500">No location</span>
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
      </div>
    </div>
  )
}