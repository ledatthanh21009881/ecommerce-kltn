'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Eye, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { getAuthData } from '@/lib/admin-auth'

interface AnalyticsData {
  revenue: {
    total: number
    change: number
    trend: 'up' | 'down'
  }
  orders: {
    total: number
    change: number
    trend: 'up' | 'down'
  }
  customers: {
    total: number
    change: number
    trend: 'up' | 'down'
  }
  views: {
    total: number
    change: number
    trend: 'up' | 'down'
  }
  top_products: Array<{
    product_id: number
    product_name: string
    sales: number
    revenue: number
  }>
  recent_orders: Array<{
    order_id: number
    customer_name: string
    amount: number
    status: string
    created_at: string
  }>
  sales_chart: Array<{
    date: string
    revenue: number
    orders: number
  }>
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    revenue: { total: 0, change: 0, trend: 'up' },
    orders: { total: 0, change: 0, trend: 'up' },
    customers: { total: 0, change: 0, trend: 'up' },
    views: { total: 0, change: 0, trend: 'up' },
    top_products: [],
    recent_orders: [],
    sales_chart: []
  })
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/backend/v1/analytics?range=${timeRange}`)
      const data = await response.json()
      
      if (data.success) {
        setAnalytics(data.data || analytics)
      } else {
        toast.error('Failed to fetch analytics data')
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast.error('Error fetching analytics data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Analytics Dashboard</h1>
          <p className="text-slate-600">Track your business performance and insights</p>
        </div>

        {/* Time Range Selector */}
        <Card className="bg-white shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Time Range:</span>
                <div className="flex gap-2">
                  {[
                    { value: '7d', label: '7 Days' },
                    { value: '30d', label: '30 Days' },
                    { value: '90d', label: '90 Days' },
                    { value: '1y', label: '1 Year' }
                  ].map((range) => (
                    <Button
                      key={range.value}
                      variant={timeRange === range.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimeRange(range.value)}
                    >
                      {range.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={fetchAnalytics}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(analytics.revenue.total)}
              </div>
              <div className={`flex items-center text-xs ${analytics.revenue.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.revenue.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {analytics.revenue.change > 0 ? '+' : ''}{analytics.revenue.change}% from last period
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {formatNumber(analytics.orders.total)}
              </div>
              <div className={`flex items-center text-xs ${analytics.orders.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.orders.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {analytics.orders.change > 0 ? '+' : ''}{analytics.orders.change}% from last period
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {formatNumber(analytics.customers.total)}
              </div>
              <div className={`flex items-center text-xs ${analytics.customers.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.customers.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {analytics.customers.change > 0 ? '+' : ''}{analytics.customers.change}% from last period
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Page Views</CardTitle>
              <Eye className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {formatNumber(analytics.views.total)}
              </div>
              <div className={`flex items-center text-xs ${analytics.views.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.views.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {analytics.views.change > 0 ? '+' : ''}{analytics.views.change}% from last period
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Products */}
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Top Selling Products</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  ))}
                </div>
              ) : analytics.top_products.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No product data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analytics.top_products.map((product, index) => (
                    <div key={product.product_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{product.product_name}</p>
                          <p className="text-sm text-gray-500">{formatNumber(product.sales)} sold</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(product.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  ))}
                </div>
              ) : analytics.recent_orders.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No recent orders</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analytics.recent_orders.map((order) => (
                    <div key={order.order_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Order #{order.order_id}</p>
                        <p className="text-sm text-gray-500">{order.customer_name}</p>
                        <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(order.amount)}</p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sales Chart Placeholder */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Sales chart will be displayed here</p>
                <p className="text-sm text-gray-400">Chart integration coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
