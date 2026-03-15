'use client'

import { useState, useEffect } from 'react'
import { Search, RefreshCw, CreditCard, DollarSign, CheckCircle, XCircle, Clock, AlertCircle, LayoutList, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getAuthData } from '@/lib/admin-auth'
import { useLanguage } from '@/contexts/LanguageContext'

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
  const { t } = useLanguage()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(12)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('admin_payments_view') as 'list' | 'grid') || 'list'
    return 'list'
  })

  const setViewModeAndStore = (mode: 'list' | 'grid') => {
    setViewMode(mode)
    if (typeof window !== 'undefined') localStorage.setItem('admin_payments_view', mode)
  }

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

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / limit))
  const from = filteredPayments.length === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, filteredPayments.length)
  const paginatedPayments = filteredPayments.slice((page - 1) * limit, page * limit)

  useEffect(() => {
    setPage(1)
  }, [searchTerm, statusFilter, methodFilter])

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-2">Payment Management</h1>
            <p className="text-slate-600">Track and manage payment transactions</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            <span className="text-sm font-medium text-slate-600 mr-1 hidden sm:inline">{t('view')}:</span>
            <div className="flex rounded-lg border border-slate-200 bg-white/80 overflow-hidden">
              <Button variant="ghost" size="sm" onClick={() => setViewModeAndStore('list')} className={`rounded-none ${viewMode === 'list' ? 'bg-slate-100' : ''}`} title={t('viewList')}>
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setViewModeAndStore('grid')} className={`rounded-none ${viewMode === 'grid' ? 'bg-slate-100' : ''}`} title={t('viewGrid')}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={fetchPayments} disabled={loading} className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
              <CreditCard className="h-4 w-4" />
              Process Payment
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Total Payments</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Completed</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.completed}</p>
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
                  <p className="text-sm font-medium text-slate-600 mb-1">Pending</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.pending}</p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Failed</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.failed}</p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                  <XCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold text-emerald-600">{formatCurrency(stats.total_amount)}</p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end justify-between">
              <div className="flex flex-col lg:flex-row gap-4 flex-1 w-full">
                <div className="flex flex-col flex-1 max-w-md">
                  <label className="text-xs font-medium text-slate-600 mb-1">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder="Search by customer name, transaction ID or order ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 focus:bg-white min-w-[140px]"
                  >
                    <option value="">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="processing">Processing</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">Method</label>
                  <select
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value)}
                    className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 focus:bg-white min-w-[140px]"
                  >
                    <option value="">All Methods</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash_on_delivery">Cash on Delivery</option>
                    <option value="digital_wallet">Digital Wallet</option>
                  </select>
                </div>
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
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <CreditCard className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No payments found</h3>
              <p className="text-slate-500">No payments match your search criteria.</p>
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="text-left py-3 px-4 font-medium text-slate-900">Payment</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">Customer</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">Amount</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">Method</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPayments.map((payment) => (
                      <tr key={payment.payment_id} className="border-b border-slate-100 hover:bg-slate-50/80">
                        <td className="py-4 px-4 font-medium text-slate-900">#{payment.payment_id}</td>
                        <td className="py-4 px-4 text-slate-600">{payment.customer_name}</td>
                        <td className="py-4 px-4 font-medium text-green-600">{formatCurrency(payment.amount)}</td>
                        <td className="py-4 px-4">
                          <Badge variant="outline" className={getMethodColor(payment.payment_method)}>{payment.payment_method.replace('_', ' ')}</Badge>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant="outline" className={`${getStatusColor(payment.status)} flex items-center gap-1 w-fit`}>
                            {getStatusIcon(payment.status)}
                            {payment.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-600">{formatDate(payment.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedPayments.map((payment) => (
              <Card key={payment.payment_id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
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

        {/* Pagination */}
        {!loading && filteredPayments.length > 0 && totalPages > 1 && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mt-6">
            <CardContent className="py-4 px-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-slate-600">
                  {t('showingXOfY', { from: String(from), to: String(to), total: String(filteredPayments.length) })}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="bg-white/80 border-slate-200">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-slate-600 px-2">{t('pageOf', { current: String(page), total: String(totalPages) })}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="bg-white/80 border-slate-200">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
