
'use client'

import { useState, useEffect } from 'react'
import { Search, RefreshCw, ShoppingCart, Eye, Package, Truck, CheckCircle, Clock, XCircle, Edit, MoreHorizontal, Download, FileText, Calendar, TrendingUp, Users, DollarSign, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Order, OrderStatistics } from '@/lib/types'
import OrderDetailModal from '@/components/admin/OrderDetailModal'
import OrderStatusModal from '@/components/admin/OrderStatusModal'
import AssignShipperModal from '@/components/admin/AssignShipperModal'
import ConfirmModal from '@/components/ui/confirm-modal'
import { getAuthData } from '@/lib/admin-auth'
import { ordersApi } from '@/lib/api'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [statistics, setStatistics] = useState<OrderStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  
  // Modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [isShipperModalOpen, setIsShipperModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null)

  // Fetch orders
  const fetchOrders = async () => {
    try {
      setLoading(true)
      console.log('Fetching orders...')
      
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (searchTerm) params.append('search', searchTerm)
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)
      
      const response = await fetch(`/api/backend/v1/orders?${params.toString()}`)
      console.log('Response status:', response.status)
      
      const data = await response.json()
      console.log('Response data:', data)
      
      if (data.success) {
        const ordersData = data.data.items || data.data || []
        console.log('Orders data:', ordersData)
        setOrders(ordersData)
      } else {
        console.error('Failed to fetch orders:', data)
        toast.error('Failed to fetch orders')
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Error fetching orders')
    } finally {
      setLoading(false)
    }
  }

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      console.log('Fetching statistics...')
      const data = await ordersApi.getStatistics()
      console.log('Statistics data:', data)
      
      if (data.success) {
        setStatistics(data.data)
      }
    } catch (error) {
      console.error('Error fetching statistics:', error)
    }
  }

  useEffect(() => {
    fetchOrders()
    fetchStatistics()
  }, [])

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${order.first_name} ${order.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_id.toString().includes(searchTerm)
    const matchesStatus = !statusFilter || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'processing':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'shipping':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'returned':
        return 'bg-orange-50 text-orange-700 border-orange-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'processing':
        return <Package className="h-4 w-4" />
      case 'shipping':
        return <Truck className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      case 'returned':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Handle order actions
  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order)
    setIsDetailModalOpen(true)
  }

  const handleUpdateStatus = (order: Order) => {
    setSelectedOrder(order)
    setIsStatusModalOpen(true)
  }

  const handleAssignShipper = (order: Order) => {
    setSelectedOrder(order)
    setIsShipperModalOpen(true)
  }

  const handleCancelOrder = (order: Order) => {
    setSelectedOrder(order)
    setDeletingOrderId(order.order_id)
    setIsDeleteModalOpen(true)
  }

    const handleGenerateInvoice = async (order: Order, format: 'pdf' | 'email') => {
    // Kiểm tra trạng thái đơn hàng
    if (order.status !== 'completed') {
      const action = format === 'pdf' ? 'In hóa đơn' : 'Gửi hóa đơn qua email'
      toast.error(`${action} chỉ có thể thực hiện khi đơn hàng đã hoàn thành (Completed)`)
      return
    }

    try {
      if (format === 'pdf') {
        // Sử dụng Next.js API route cho PDF
        const response = await fetch(`/api/backend/v1/invoice/generate?order_id=${order.order_id}&format=pdf`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          }
        })

        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `invoice-${order.order_id}.pdf`
          a.click()
          window.URL.revokeObjectURL(url)
          toast.success('Tải hóa đơn PDF thành công!')
        } else {
          const data = await response.json()
          toast.error(data.message || 'Lỗi khi tạo hóa đơn PDF')
        }
      } else if (format === 'email') {
        // Sử dụng ordersApi.sendInvoice cho email
        const data = await ordersApi.sendInvoice(order.order_id.toString(), { format: 'email' })
        
        if (data.success) {
          toast.success('Hóa đơn đã được gửi qua email!')
        } else {
          toast.error(data.message || 'Lỗi khi gửi hóa đơn qua email')
        }
      }
    } catch (error) {
      console.error('Error generating invoice:', error)
      toast.error('Lỗi khi tạo hóa đơn')
    }
  }

  const confirmCancelOrder = async () => {
    if (!deletingOrderId) return

    try {
      const { token } = getAuthData()
      
      const data = await ordersApi.delete(deletingOrderId.toString())
      
      if (data.success) {
        toast.success('Order cancelled successfully')
        fetchOrders()
        fetchStatistics()
      } else {
        toast.error(data.message || 'Failed to cancel order')
      }
    } catch (error) {
      console.error('Error cancelling order:', error)
      toast.error('Error cancelling order')
    } finally {
      setIsDeleteModalOpen(false)
      setDeletingOrderId(null)
    }
  }

  const handleExportOrders = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)
      
      const response = await fetch(`/api/backend/v1/orders/export?${params.toString()}`)
      const data = await response.json()
      
      if (data.success) {
        // Create and download CSV
        const csvContent = data.data.map((order: any) => 
          `${order.invoice_number},${order.customer_name},${order.email},${order.status},${order.total_amount},${order.created_at}`
        ).join('\n')
        
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
        
        toast.success('Orders exported successfully')
      } else {
        toast.error('Failed to export orders')
      }
    } catch (error) {
      console.error('Error exporting orders:', error)
      toast.error('Error exporting orders')
    }

  }

  const handleStatusUpdate = () => {
    fetchOrders()
    fetchStatistics()
  }

  const handleShipperAssigned = () => {
    fetchOrders()
    fetchStatistics()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Order Management
              </h1>
              <p className="text-slate-600 mt-2 text-lg">Track and manage customer orders with real-time updates</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  fetchOrders()
                  fetchStatistics()
                }}
                disabled={loading}
                className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Total Orders</p>
                  <p className="text-3xl font-bold text-slate-900">{statistics?.total_orders || 0}</p>
                  <p className="text-xs text-slate-500 mt-1">All time orders</p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Active Orders</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {(statistics?.pending_orders || 0) + (statistics?.processing_orders || 0) + (statistics?.shipping_orders || 0)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Pending + Processing + Shipping</p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Completed</p>
                  <p className="text-3xl font-bold text-slate-900">{statistics?.completed_orders || 0}</p>
                  <p className="text-xs text-slate-500 mt-1">Successfully delivered</p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Revenue</p>
                  <p className="text-3xl font-bold text-emerald-600">
                    {formatPrice(statistics?.total_revenue || 0)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">From completed orders</p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end justify-between">
              <div className="flex flex-col lg:flex-row gap-4 flex-1 w-full">
                {/* Search */}
                <div className="flex flex-col flex-1 max-w-md">
                  <label className="text-xs font-medium text-slate-600 mb-1">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder="Search orders by ID, customer name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">Status Filter</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 focus:bg-white transition-all duration-200 min-w-[140px]"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipping">Shipping</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="returned">Returned</option>
                  </select>
                </div>

                {/* Date Filters */}
                <div className="flex gap-2">
                  <div className="flex flex-col">
                    <label className="text-xs font-medium text-slate-600 mb-1">From Date</label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      placeholder="From"
                      className="w-40 bg-white/50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-medium text-slate-600 mb-1">To Date</label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      placeholder="To"
                      className="w-40 bg-white/50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-medium text-slate-600 mb-1">Actions</label>
                <Button
                  variant="outline"
                  onClick={handleExportOrders}
                  className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg animate-pulse">
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
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="h-24 w-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="h-12 w-12 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No orders found</h3>
              <p className="text-slate-500">No orders match your search criteria.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Card key={order.order_id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Order Info */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <FileText className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-lg tracking-tight font-sans">
                              {order.invoice_number}
                            </h3>
                            <p className="text-sm text-slate-500">Order #{order.order_id}</p>
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`flex items-center gap-1 px-3 py-1 ${getStatusColor(order.status)}`}
                        >
                          {getStatusIcon(order.status)}
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Customer</p>
                          <p className="font-semibold text-slate-900">{order.first_name} {order.last_name}</p>
                          <p className="text-sm text-slate-600">{order.email}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Phone</p>
                          <p className="font-semibold text-slate-900">{order.phone}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Amount</p>
                          <p className="font-bold text-lg text-emerald-600">{formatPrice(order.total_amount)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Items</p>
                          <p className="font-semibold text-slate-900">{order.item_count || 'N/A'} items</p>
                        </div>
                      </div>

                      <div className="text-xs text-slate-400 border-t border-slate-100 pt-3">
                        Created: {formatDate(order.created_at)}
                        {order.updated_at && order.updated_at !== order.created_at && (
                          <span className="ml-4">Updated: {formatDate(order.updated_at)}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 lg:flex-col relative isolate">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(order)}
                        className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm border-slate-200 z-50 shadow-lg">
                          <DropdownMenuItem onClick={() => handleUpdateStatus(order)}>
                            <Package className="mr-2 h-4 w-4" />
                            Update Status
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAssignShipper(order)}>
                            <Truck className="mr-2 h-4 w-4" />
                            Assign Shipper
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleGenerateInvoice(order, 'pdf')}
                            className={order.status !== 'completed' ? 'opacity-50 cursor-not-allowed' : ''}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            In hóa đơn
                            {order.status !== 'completed' && (
                              <span className="ml-2 text-xs text-slate-500">(Cần Completed)</span>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleGenerateInvoice(order, 'email')}
                            className={order.status !== 'completed' ? 'opacity-50 cursor-not-allowed' : ''}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Gửi mail
                            {order.status !== 'completed' && (
                              <span className="ml-2 text-xs text-slate-500">(Cần Completed)</span>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {order.status !== 'cancelled' && order.status !== 'completed' && (
                            <DropdownMenuItem 
                              onClick={() => handleCancelOrder(order)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel Order
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <OrderDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        order={selectedOrder}
        onStatusUpdate={handleStatusUpdate}
      />

      <OrderStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        order={selectedOrder}
        onStatusUpdate={handleStatusUpdate}
      />

      <AssignShipperModal
        isOpen={isShipperModalOpen}
        onClose={() => setIsShipperModalOpen(false)}
        order={selectedOrder}
        onShipperAssigned={handleShipperAssigned}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmCancelOrder}
        title="Cancel Order"
        description="Are you sure you want to cancel this order? This action cannot be undone."
        confirmText="Cancel Order"
        cancelText="Keep Order"
      />
    </div>
  )
}

