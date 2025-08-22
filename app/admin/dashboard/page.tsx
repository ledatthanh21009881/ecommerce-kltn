'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, ShoppingCart, Users, DollarSign, Package, Eye, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { getAuthData } from '@/lib/admin-auth'

interface DashboardStats {
  total_products: number
  total_orders: number
  total_users: number
  total_revenue: number
  recent_orders: any[]
  top_products: any[]
  sales_chart: any[]
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    total_products: 0,
    total_orders: 0,
    total_users: 0,
    total_revenue: 0,
    recent_orders: [],
    top_products: [],
    sales_chart: []
  })
  const [loading, setLoading] = useState(true)

  // Fetch dashboard stats
  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/backend/v1/dashboard')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.data || {})
      } else {
        toast.error('Failed to fetch dashboard data')
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Error fetching dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
          <p className="text-slate-600">Welcome back! Here's what's happening with your store today.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{formatPrice(stats.total_revenue)}</div>
              <div className="flex items-center text-xs text-slate-600 mt-1">
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                <span className="text-green-600">+12.5%</span>
                <span className="ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.total_orders}</div>
              <div className="flex items-center text-xs text-slate-600 mt-1">
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                <span className="text-green-600">+8.2%</span>
                <span className="ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Products</CardTitle>
              <Package className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.total_products}</div>
              <div className="flex items-center text-xs text-slate-600 mt-1">
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                <span className="text-green-600">+3.1%</span>
                <span className="ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Users</CardTitle>
              <Users className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.total_users}</div>
              <div className="flex items-center text-xs text-slate-600 mt-1">
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                <span className="text-green-600">+15.3%</span>
                <span className="ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Orders */}
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Orders</span>
                <Button variant="outline" size="sm">
                  View All
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 animate-pulse">
                      <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats.recent_orders.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No recent orders</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.recent_orders.slice(0, 5).map((order: any) => (
                    <div key={order.order_id} className="flex items-center space-x-4">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          Order #{order.order_id}
                        </p>
                        <p className="text-sm text-slate-500">
                          {order.customer_name} • {formatPrice(order.total_amount)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <Badge variant="outline" className="text-xs">
                          {order.status}
                        </Badge>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Top Products</span>
                <Button variant="outline" size="sm">
                  View All
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 animate-pulse">
                      <div className="h-10 w-10 bg-gray-200 rounded"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats.top_products.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No products data</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.top_products.slice(0, 5).map((product: any, index: number) => (
                    <div key={product.product_id} className="flex items-center space-x-4">
                      <div className="h-10 w-10 bg-purple-100 rounded flex items-center justify-center">
                        <span className="text-sm font-medium text-purple-600">#{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {product.product_name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {product.sales_count || 0} sales • {formatPrice(product.revenue || 0)}
                        </p>
                      </div>
                      <div className="flex items-center text-xs text-slate-500">
                        <Eye className="h-3 w-3 mr-1" />
                        {product.view_count || 0}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                <Package className="h-6 w-6" />
                <span>Add Product</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                <ShoppingCart className="h-6 w-6" />
                <span>View Orders</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                <Users className="h-6 w-6" />
                <span>Manage Users</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
                <TrendingUp className="h-6 w-6" />
                <span>View Reports</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
