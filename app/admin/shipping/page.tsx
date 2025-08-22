'use client'

import { useState, useEffect } from 'react'
import { Search, RefreshCw, Truck, MapPin, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getAuthData } from '@/lib/admin-auth'

interface ShippingOrder {
  order_id: number
  customer_name: string
  customer_address: string
  customer_phone: string
  shipper_name?: string
  shipper_phone?: string
  status: string
  created_at: string
  estimated_delivery?: string
  actual_delivery?: string
  tracking_number?: string
}

export default function AdminShippingPage() {
  const [shippingOrders, setShippingOrders] = useState<ShippingOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Fetch shipping orders
  const fetchShippingOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/backend/v1/shipping')
      const data = await response.json()
      
      if (data.success) {
        setShippingOrders(data.data || [])
      } else {
        toast.error('Failed to fetch shipping orders')
      }
    } catch (error) {
      console.error('Error fetching shipping orders:', error)
      toast.error('Error fetching shipping orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchShippingOrders()
  }, [])

  // Filter shipping orders
  const filteredOrders = shippingOrders.filter(order => {
    const matchesSearch = 
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.tracking_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_id.toString().includes(searchTerm)
    const matchesStatus = !statusFilter || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'assigned':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'in_transit':
        return 'bg-purple-100 text-purple-800 border-purple-200'
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
      case 'assigned':
        return <Truck className="h-4 w-4" />
      case 'in_transit':
        return <MapPin className="h-4 w-4" />
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />
      case 'failed':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getShippingStats = () => {
    const stats = {
      total: shippingOrders.length,
      pending: shippingOrders.filter(o => o.status === 'pending').length,
      assigned: shippingOrders.filter(o => o.status === 'assigned').length,
      in_transit: shippingOrders.filter(o => o.status === 'in_transit').length,
      delivered: shippingOrders.filter(o => o.status === 'delivered').length,
      failed: shippingOrders.filter(o => o.status === 'failed').length
    }
    return stats
  }

  const stats = getShippingStats()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Shipping Management</h1>
          <p className="text-slate-600">Track and manage order deliveries</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Orders</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Truck className="h-6 w-6 text-blue-600" />
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
                  <p className="text-sm font-medium text-slate-600">Assigned</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.assigned}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Truck className="h-6 w-6 text-blue-600" />
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
                  <MapPin className="h-6 w-6 text-purple-600" />
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
                  <AlertTriangle className="h-6 w-6 text-red-600" />
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
                  <option value="assigned">Assigned</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={fetchShippingOrders}
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
                  Assign Shipper
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Orders List */}
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
              <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No shipping orders found</h3>
              <p className="text-gray-500">No orders match your search criteria.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Card key={order.order_id} className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Order Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-4">
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

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Customer</p>
                          <p className="font-medium">{order.customer_name}</p>
                          <p className="text-gray-500">{order.customer_phone}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Address</p>
                          <p className="text-sm">{order.customer_address}</p>
                        </div>
                        {order.shipper_name && (
                          <div>
                            <p className="text-gray-600">Shipper</p>
                            <p className="font-medium">{order.shipper_name}</p>
                            <p className="text-gray-500">{order.shipper_phone}</p>
                          </div>
                        )}
                      </div>

                      {order.tracking_number && (
                        <div>
                          <p className="text-gray-600 text-sm">Tracking Number</p>
                          <p className="font-mono text-sm">{order.tracking_number}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                        <span>Created: {formatDate(order.created_at)}</span>
                        {order.estimated_delivery && (
                          <span>Estimated: {formatDate(order.estimated_delivery)}</span>
                        )}
                        {order.actual_delivery && (
                          <span>Delivered: {formatDate(order.actual_delivery)}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 lg:flex-col">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        Track Order
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        Update Status
                      </Button>
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
