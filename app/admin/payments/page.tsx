'use client'

import { useState, useEffect } from 'react'
import { Search, RefreshCw, CreditCard, DollarSign, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getAuthData } from '@/lib/admin-auth'

interface Payment {
  payment_id: number
  order_id: number
  customer_name: string
  amount: number
  payment_method: string
  status: string
  transaction_id?: string
  created_at: string
  processed_at?: string
  gateway_response?: string
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')

  // Fetch payments
  const fetchPayments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/backend/v1/payments')
      const data = await response.json()
      
      if (data.success) {
        setPayments(data.data || [])
      } else {
        toast.error('Failed to fetch payments')
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast.error('Error fetching payments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  // Filter payments
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.order_id.toString().includes(searchTerm)
    const matchesStatus = !statusFilter || payment.status === statusFilter
    const matchesMethod = !methodFilter || payment.payment_method === methodFilter
    return matchesSearch && matchesStatus && matchesMethod
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'refunded':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'failed':
        return <XCircle className="h-4 w-4" />
      case 'processing':
        return <AlertCircle className="h-4 w-4" />
      case 'refunded':
        return <DollarSign className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'credit_card':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'bank_transfer':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'cash_on_delivery':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'digital_wallet':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPaymentStats = () => {
    const stats = {
      total: payments.length,
      completed: payments.filter(p => p.status === 'completed').length,
      pending: payments.filter(p => p.status === 'pending').length,
      failed: payments.filter(p => p.status === 'failed').length,
      total_amount: payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0)
    }
    return stats
  }

  const stats = getPaymentStats()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Payment Management</h1>
          <p className="text-slate-600">Track and manage payment transactions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Payments</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Completed</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.completed}</p>
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
                  <p className="text-sm font-medium text-slate-600">Failed</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.failed}</p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.total_amount)}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
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
                    placeholder="Search by customer name, transaction ID or order ID..."
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
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="processing">Processing</option>
                  <option value="refunded">Refunded</option>
                </select>

                {/* Method Filter */}
                <select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Methods</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash_on_delivery">Cash on Delivery</option>
                  <option value="digital_wallet">Digital Wallet</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={fetchPayments}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <CreditCard className="h-4 w-4" />
                  Process Payment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments List */}
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
        ) : filteredPayments.length === 0 ? (
          <Card className="bg-white shadow-sm">
            <CardContent className="p-12 text-center">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
              <p className="text-gray-500">No payments match your search criteria.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPayments.map((payment) => (
              <Card key={payment.payment_id} className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Payment Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-4">
                        <h3 className="font-semibold text-gray-900">
                          Payment #{payment.payment_id}
                        </h3>
                        <Badge 
                          variant="outline" 
                          className={`flex items-center gap-1 ${getStatusColor(payment.status)}`}
                        >
                          {getStatusIcon(payment.status)}
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`flex items-center gap-1 ${getMethodColor(payment.payment_method)}`}
                        >
                          {payment.payment_method.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Customer</p>
                          <p className="font-medium">{payment.customer_name}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Order ID</p>
                          <p className="font-medium">#{payment.order_id}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Amount</p>
                          <p className="font-bold text-lg text-green-600">{formatCurrency(payment.amount)}</p>
                        </div>
                        {payment.transaction_id && (
                          <div>
                            <p className="text-gray-600">Transaction ID</p>
                            <p className="font-mono text-sm">{payment.transaction_id}</p>
                          </div>
                        )}
                      </div>

                      {payment.gateway_response && (
                        <div>
                          <p className="text-gray-600 text-sm">Gateway Response</p>
                          <p className="text-sm">{payment.gateway_response}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                        <span>Created: {formatDate(payment.created_at)}</span>
                        {payment.processed_at && (
                          <span>Processed: {formatDate(payment.processed_at)}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 lg:flex-col">
                      {payment.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </Button>
                      )}
                      {payment.status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <DollarSign className="h-4 w-4" />
                          Refund
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <CreditCard className="h-4 w-4" />
                        View Details
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
