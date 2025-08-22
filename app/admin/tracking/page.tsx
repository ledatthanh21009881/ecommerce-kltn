'use client'

import { useState, useEffect } from 'react'
import { Search, RefreshCw, Package, Truck, MapPin, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getAuthData } from '@/lib/admin-auth'

interface TrackingOrder {
  order_id: number
  customer_name: string
  customer_phone: string
  shipping_address: string
  tracking_number: string
  status: string
  current_location?: string
  estimated_delivery: string
  actual_delivery?: string
  shipper_name?: string
  shipper_phone?: string
  created_at: string
  updated_at: string
  tracking_history: Array<{
    status: string
    location?: string
    description: string
    timestamp: string
  }>
}

export default function AdminTrackingPage() {
  const [orders, setOrders] = useState<TrackingOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Fetch tracking orders
  const fetchTrackingOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/backend/v1/tracking')
      const data = await response.json()
      
      if (data.success) {
        setOrders(data.data || [])
      } else {
        toast.error('Failed to fetch tracking orders')
      }
    } catch (error) {
      console.error('Error fetching tracking orders:', error)
      toast.error('Error fetching tracking orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrackingOrders()
  }, [])

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_id.toString().includes(searchTerm)
    const matchesStatus = !statusFilter || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'shipped':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'in_transit':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'out_for_delivery':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />
      case 'shipped':
        return <Package className="h-4 w-4" />
      case 'in_transit':
        return <Truck className="h-4 w-4" />
      case 'out_for_delivery':
        return <MapPin className="h-4 w-4" />
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />
      case 'failed':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getTrackingStats = () => {
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      in_transit: orders.filter(o => o.status === 'in_transit' || o.status === 'shipped' || o.status === 'out_for_delivery').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      failed: orders.filter(o => o.status === 'failed').length
    }
    return stats
  }

  const stats = getTrackingStats()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusStep = (status: string) => {
    const steps = {
      'pending': 1,
      'confirmed': 2,
      'shipped': 3,
      'in_transit': 4,
      'out_for_delivery': 5,
      'delivered': 6,
      'failed': 0
    }
    return steps[status as keyof typeof steps] || 0
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Order Tracking</h1>
          <p className="text-slate-600">Track and monitor order delivery status</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Orders</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Pending</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">In Transit</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.in_transit}</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Truck className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Delivered</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.delivered}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Failed</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.failed}</p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="bg-white shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder="Search by customer name, tracking number or order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="in_transit">In Transit</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={fetchTrackingOrders}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Truck className="h-4 w-4" />
                  Update Status
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tracking Orders List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="bg-white shadow-sm animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="bg-white shadow-sm">
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tracking orders found</h3>
              <p className="text-gray-500">No orders match your search criteria.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <Card key={order.order_id} className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Order Header */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            Order #{order.order_id}
                          </h3>
                          <Badge 
                            variant="outline" 
                            className={`flex items-center gap-1 ${getStatusColor(order.status)}`}
                          >
                            {getStatusIcon(order.status)}
                            {order.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Customer</p>
                            <p className="font-medium">{order.customer_name}</p>
                            <p className="text-gray-500">{order.customer_phone}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Tracking Number</p>
                            <p className="font-mono font-medium">{order.tracking_number}</p>
                          </div>
                          {order.shipper_name && (
                            <div>
                              <p className="text-gray-600">Shipper</p>
                              <p className="font-medium">{order.shipper_name}</p>
                              <p className="text-gray-500">{order.shipper_phone}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 lg:flex-col">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <MapPin className="h-4 w-4" />
                          Track Location
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Package className="h-4 w-4" />
                          Update Status
                        </Button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Delivery Progress</span>
                        <span className="font-medium">{Math.round((getStatusStep(order.status) / 6) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(getStatusStep(order.status) / 6) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Order Placed</span>
                        <span>Confirmed</span>
                        <span>Shipped</span>
                        <span>In Transit</span>
                        <span>Out for Delivery</span>
                        <span>Delivered</span>
                      </div>
                    </div>

                    {/* Tracking History */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Tracking History</h4>
                      <div className="space-y-2">
                        {order.tracking_history.slice(0, 3).map((event, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{event.description}</p>
                              {event.location && (
                                <p className="text-xs text-gray-500">{event.location}</p>
                              )}
                              <p className="text-xs text-gray-400">{formatDate(event.timestamp)}</p>
                            </div>
                          </div>
                        ))}
                        {order.tracking_history.length > 3 && (
                          <Button variant="outline" size="sm" className="w-full">
                            View All History ({order.tracking_history.length} events)
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Delivery Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Shipping Address</p>
                        <p className="font-medium">{order.shipping_address}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Estimated Delivery</p>
                        <p className="font-medium">{formatDate(order.estimated_delivery)}</p>
                        {order.actual_delivery && (
                          <p className="text-xs text-gray-500">Actual: {formatDate(order.actual_delivery)}</p>
                        )}
                      </div>
                    </div>

                    {/* Timestamps */}
                    <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                      <span>Ordered: {formatDate(order.created_at)}</span>
                      <span>Updated: {formatDate(order.updated_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
