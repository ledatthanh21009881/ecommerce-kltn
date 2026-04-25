'use client'

import { useState, useEffect } from 'react'
import { Search, RefreshCw, CreditCard, DollarSign, CheckCircle, XCircle, Clock, AlertCircle, LayoutList, LayoutGrid, ChevronLeft, ChevronRight, Eye, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { getAuthData, checkAndRefreshAuth } from '@/lib/admin-auth'
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
  expires_at?: string | null
  gateway_response?: string
}

/** True if payment can be approved (pending and not expired). */
function canApprove(payment: Payment): boolean {
  if (payment.status !== 'pending') return false
  if (!payment.expires_at) return true
  return new Date(payment.expires_at).getTime() > Date.now()
}

/** Normalize API row to Payment so backend can use different key names */
function normalizePayment(row: Record<string, unknown>): Payment {
  const r = row as Record<string, unknown>
  return {
    payment_id: Number(r.payment_id ?? 0),
    order_id: Number(r.order_id ?? 0),
    customer_name: String(r.customer_name ?? r.customerName ?? ''),
    amount: Number(r.amount ?? r.paid_amount ?? 0),
    payment_method: String(r.payment_method ?? r.method ?? 'unknown'),
    status: String(r.status ?? 'pending'),
    transaction_id: r.transaction_id != null ? String(r.transaction_id) : undefined,
    created_at: String(r.created_at ?? ''),
    processed_at: (r.processed_at ?? r.confirmed_at) != null ? String(r.processed_at ?? r.confirmed_at) : undefined,
    expires_at: (r.expires_at ?? null) != null ? String(r.expires_at) : undefined,
    gateway_response: r.gateway_response != null ? String(r.gateway_response) : undefined,
  }
}

export default function AdminPaymentsPage() {
  const { t } = useLanguage()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [limit] = useState(12)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('admin_payments_view') as 'list' | 'grid') || 'list'
    return 'list'
  })
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [processForm, setProcessForm] = useState({ order_id: '', method: 'cod', amount: '' })
  const [submitting, setSubmitting] = useState(false)

  const setViewModeAndStore = (mode: 'list' | 'grid') => {
    setViewMode(mode)
    if (typeof window !== 'undefined') localStorage.setItem('admin_payments_view', mode)
  }

  // Fetch payments
  const fetchPayments = async () => {
    try {
      setLoading(true)
      const ok = await checkAndRefreshAuth()
      if (!ok) {
        if (typeof window !== 'undefined') window.location.href = '/admin-login'
        return
      }
      const { token } = getAuthData()
      const response = await fetch('/api/backend/v1/payments', {
        headers: token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : {},
      })
      const data = await response.json()
      
      if (data.success) {
        const raw = data.data
        const list = Array.isArray(raw) ? raw : []
        setPayments(list.map((row: Record<string, unknown>) => normalizePayment(row)))
      } else {
        toast.error(t('failedToFetchPayments'))
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

  const handleProcessSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const orderId = parseInt(processForm.order_id, 10)
    const amount = parseFloat(processForm.amount)
    if (!orderId || orderId < 1 || !amount || amount <= 0) {
      toast.error(t('pleaseEnterValidOrderIdAndAmount'))
      return
    }
    try {
      setSubmitting(true)
      const ok = await checkAndRefreshAuth()
      if (!ok) {
        if (typeof window !== 'undefined') window.location.href = '/admin-login'
        return
      }
      const { token } = getAuthData()
      const res = await fetch('/api/backend/v1/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ order_id: orderId, method: processForm.method, amount }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(t('paymentCreatedSuccessfully'))
        setIsProcessModalOpen(false)
        setProcessForm({ order_id: '', method: 'cod', amount: '' })
        fetchPayments()
      } else {
        toast.error(data.message || t('failedToCreatePayment'))
      }
    } catch (err) {
      console.error(err)
      toast.error(t('failedToCreatePayment'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (payment: Payment) => {
    try {
      const ok = await checkAndRefreshAuth()
      if (!ok) {
        if (typeof window !== 'undefined') window.location.href = '/admin-login'
        return
      }
      const { token } = getAuthData()
      const res = await fetch(`/api/backend/v1/payments/${payment.payment_id}/approve`, {
        method: 'POST',
        headers: token
          ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
          : { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (data.success) {
        toast.success(t('paymentApprovedSuccessfully'))
        fetchPayments()
      } else {
        const errMsg =
          (data.errors && typeof data.errors === 'object' && (data.errors.payment ?? Object.values(data.errors)[0])) ||
          data.message ||
          t('failedToApprovePayment')
        if (typeof errMsg === 'string') {
          const normalizedErr = errMsg.toLowerCase()
          if (normalizedErr.includes('payment has expired')) {
            toast.error(t('paymentExpired'))
          } else if (normalizedErr.includes('payment is not pending')) {
            toast.error(t('paymentIsNotPending'))
          } else {
            toast.error(errMsg)
          }
        } else {
          toast.error(t('failedToApprovePayment'))
        }
      }
    } catch (err) {
      console.error(err)
      toast.error(t('failedToApprovePayment'))
    }
  }

  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment)
    setIsDetailModalOpen(true)
  }

  // Filter payments
  const isCashMethod = (method: string) => {
    const normalizedMethod = method.toLowerCase()
    return normalizedMethod === 'cod' || normalizedMethod === 'cash_on_delivery'
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.order_id.toString().includes(searchTerm)
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter
    const matchesMethod = methodFilter === 'all' || (methodFilter === 'cash' ? isCashMethod(payment.payment_method) : !isCashMethod(payment.payment_method))
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
    if (isCashMethod(method)) return 'bg-blue-100 text-blue-800 border-blue-200'
    return 'bg-green-100 text-green-800 border-green-200'
  }

  const getMethodLabel = (method: string) => {
    return isCashMethod(method) ? 'Tiền mặt' : 'Chuyển khoản'
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

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: t('pending'),
      completed: t('completed'),
      failed: t('failedStatus'),
      processing: t('processingStatus'),
      refunded: t('refunded'),
      confirmed: t('confirmed'),
    }
    return map[status] ?? status
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="admin-page-title mb-2">{t('paymentManagement')}</h1>
            <p className="admin-page-description">{t('paymentManagementDesc')}</p>
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
              {t('refresh')}
            </Button>
            <Button onClick={() => setIsProcessModalOpen(true)} className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {t('processPayment')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[auto_1fr_1fr_1fr_1fr] gap-6 mb-8">
          {/* Total Revenue: first, width auto theo số tiền */}
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md order-first w-fit max-w-full">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-500/15 to-transparent" />
            <CardContent className="p-6 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-600 mb-1">{t('totalRevenue')}</p>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600 whitespace-nowrap">{formatCurrency(stats.total_amount)}</p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700">
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-blue-500/15 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('totalPayments')}</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-700">
                  <CreditCard className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-500/15 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('completed')}</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.completed}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700">
                  <CheckCircle className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-amber-500/15 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('pending')}</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.pending}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-red-500/15 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('failedStatus')}</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.failed}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-700">
                  <XCircle className="h-4 w-4" />
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
                  <label className="text-xs font-medium text-slate-600 mb-1">{t('search')}</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder={t('searchPaymentsPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">{t('status')}</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="min-w-[170px] border-slate-200 bg-white/50 focus:bg-white">
                      <SelectValue placeholder={t('allStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allStatus')}</SelectItem>
                      <SelectItem value="completed">{t('completed')}</SelectItem>
                      <SelectItem value="pending">{t('pending')}</SelectItem>
                      <SelectItem value="failed">{t('failedStatus')}</SelectItem>
                      <SelectItem value="processing">{t('processingStatus')}</SelectItem>
                      <SelectItem value="refunded">{t('refunded')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">{t('method')}</label>
                  <Select value={methodFilter} onValueChange={setMethodFilter}>
                    <SelectTrigger className="min-w-[180px] border-slate-200 bg-white/50 focus:bg-white">
                      <SelectValue placeholder={t('allMethods')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allMethods')}</SelectItem>
                      <SelectItem value="cash">Tiền mặt</SelectItem>
                      <SelectItem value="transfer">Chuyển khoản</SelectItem>
                    </SelectContent>
                  </Select>
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
              <h3 className="text-lg font-medium text-slate-900 mb-2">{t('noPaymentsFound')}</h3>
              <p className="text-slate-500">{t('noPaymentsMatch')}</p>
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('paymentLabel')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('customer')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('amountLabel')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('method')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('status')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('created')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPayments.map((payment) => (
                      <tr key={payment.payment_id} className="border-b border-slate-100 hover:bg-slate-50/80">
                        <td className="py-4 px-4 font-medium text-slate-900">#{payment.payment_id}</td>
                        <td className="py-4 px-4 text-slate-600">{payment.customer_name}</td>
                        <td className="py-4 px-4 font-medium text-green-600">{formatCurrency(payment.amount)}</td>
                        <td className="py-4 px-4">
                          <Badge variant="outline" className={getMethodColor(payment.payment_method)}>{getMethodLabel(payment.payment_method)}</Badge>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant="outline" className={`${getStatusColor(payment.status)} flex items-center gap-1 w-fit`}>
                            {getStatusIcon(payment.status)}
                            {getStatusLabel(payment.status)}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-600">{formatDate(payment.created_at)}</td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            {canApprove(payment) && (
                              <Button variant="outline" size="sm" className="gap-1" onClick={() => handleApprove(payment)}>
                                <CheckCircle className="h-3.5 w-3.5" /> {t('approvePayment')}
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="gap-1" onClick={() => handleViewDetails(payment)}>
                              <Eye className="h-3.5 w-3.5" /> {t('view')}
                            </Button>
                          </div>
                        </td>
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
                          {t('paymentLabel')} #{payment.payment_id}
                        </h3>
                        <Badge 
                          variant="outline" 
                          className={`flex items-center gap-1 ${getStatusColor(payment.status)}`}
                        >
                          {getStatusIcon(payment.status)}
                          {getStatusLabel(payment.status)}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`flex items-center gap-1 ${getMethodColor(payment.payment_method)}`}
                        >
                          {getMethodLabel(payment.payment_method)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">{t('customer')}</p>
                          <p className="font-medium">{payment.customer_name}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">{t('orderId')}</p>
                          <p className="font-medium">#{payment.order_id}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">{t('amountLabel')}</p>
                          <p className="font-bold text-lg text-green-600">{formatCurrency(payment.amount)}</p>
                        </div>
                        {payment.transaction_id && (
                          <div>
                            <p className="text-gray-600">{t('transactionId')}</p>
                            <p className="font-mono text-sm">{payment.transaction_id}</p>
                          </div>
                        )}
                      </div>

                      {payment.gateway_response && (
                        <div>
                          <p className="text-gray-600 text-sm">{t('gatewayResponse')}</p>
                          <p className="text-sm">{payment.gateway_response}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                        <span>{t('created')}: {formatDate(payment.created_at)}</span>
                        {payment.processed_at && (
                          <span>{t('processedAt')}: {formatDate(payment.processed_at)}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 lg:flex-col">
                      {canApprove(payment) && (
                        <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => handleApprove(payment)}>
                          <CheckCircle className="h-4 w-4" />
                          {t('approvePayment')}
                        </Button>
                      )}
                      {payment.status === 'completed' && (
                        <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => toast.info(t('refundComingSoon'))}>
                          <DollarSign className="h-4 w-4" />
                          {t('refund')}
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => handleViewDetails(payment)}>
                        <CreditCard className="h-4 w-4" />
                        {t('viewDetails')}
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

        {/* Process Payment Modal (Create) */}
        <Dialog open={isProcessModalOpen} onOpenChange={setIsProcessModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('processPaymentModal')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleProcessSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="order_id">{t('orderId')}</Label>
                <Input
                  id="order_id"
                  type="number"
                  min={1}
                  placeholder="e.g. 123"
                  value={processForm.order_id}
                  onChange={(e) => setProcessForm(f => ({ ...f, order_id: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">{t('paymentMethod')}</Label>
                <select
                  id="method"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={processForm.method}
                  onChange={(e) => setProcessForm(f => ({ ...f, method: e.target.value }))}
                >
                  <option value="cod">{t('cod')}</option>
                  <option value="payos">PayOS</option>
                  <option value="vnpay">VNPay</option>
                  <option value="vietqr">VietQR</option>
                  <option value="mock_qr">Mock QR</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">{t('amountVnd')}</Label>
                <Input
                  id="amount"
                  type="number"
                  min={1}
                  placeholder="e.g. 100000"
                  value={processForm.amount}
                  onChange={(e) => setProcessForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsProcessModalOpen(false)}>{t('cancel')}</Button>
                <Button type="submit" disabled={submitting}>{submitting ? t('creatingPayment') : t('createPayment')}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Details Modal (Read) */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('paymentLabel')} #{selectedPayment?.payment_id}</DialogTitle>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-slate-500">{t('orderId')}</span>
                  <span className="font-medium">#{selectedPayment.order_id}</span>
                  <span className="text-slate-500">{t('customer')}</span>
                  <span className="font-medium">{selectedPayment.customer_name}</span>
                  <span className="text-slate-500">{t('amountLabel')}</span>
                  <span className="font-semibold text-green-600">{formatCurrency(selectedPayment.amount)}</span>
                  <span className="text-slate-500">{t('method')}</span>
                  <span>{getMethodLabel(selectedPayment.payment_method)}</span>
                  <span className="text-slate-500">{t('status')}</span>
                  <Badge variant="outline" className={getStatusColor(selectedPayment.status)}>{getStatusLabel(selectedPayment.status)}</Badge>
                  {selectedPayment.transaction_id && (
                    <>
                      <span className="text-slate-500">{t('transactionId')}</span>
                      <span className="font-mono">{selectedPayment.transaction_id}</span>
                    </>
                  )}
                </div>
                <p className="text-slate-500 text-xs">{t('created')}: {formatDate(selectedPayment.created_at)}</p>
                {selectedPayment.processed_at && (
                  <p className="text-slate-500 text-xs">{t('processedAt')}: {formatDate(selectedPayment.processed_at)}</p>
                )}
                {selectedPayment.gateway_response && (
                  <div>
                    <p className="text-slate-500 mb-1">{t('gatewayResponse')}</p>
                    <pre className="text-xs bg-slate-50 p-2 rounded overflow-auto max-h-24">{selectedPayment.gateway_response}</pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
