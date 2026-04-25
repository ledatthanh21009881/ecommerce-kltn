'use client'

import { useState, useEffect } from 'react'
import { Search, RefreshCw, FileText, Plus, CheckCircle, XCircle, Clock, Building2, Eye, Edit, Trash2, LayoutList, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { getAuthData, checkAndRefreshAuth } from '@/lib/admin-auth'
import { useLanguage } from '@/contexts/LanguageContext'
import PurchaseReceiptModal from '@/components/admin/PurchaseReceiptModal'
import PurchaseReceiptDetailModal from '@/components/admin/PurchaseReceiptDetailModal'
import ConfirmModal from '@/components/ui/confirm-modal'

interface PurchaseReceipt {
  receipt_id: number
  supplier_id: number
  supplier_name: string
  note?: string
  status: 'pending' | 'confirmed' | 'cancelled'
  item_count: number
  total_amount: number
  created_at: string
  updated_at?: string
}

export default function AdminPurchaseReceiptsPage() {
  const { t } = useLanguage()
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [pagination, setPagination] = useState<{ total: number; per_page: number; current_page: number; last_page: number; from: number; to: number } | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('admin_receipts_view') as 'list' | 'grid') || 'list'
    return 'list'
  })
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<PurchaseReceipt | null>(null)
  const [deletingReceipt, setDeletingReceipt] = useState<PurchaseReceipt | null>(null)

  const setViewModeAndStore = (mode: 'list' | 'grid') => {
    setViewMode(mode)
    if (typeof window !== 'undefined') localStorage.setItem('admin_receipts_view', mode)
  }

  const fetchReceipts = async () => {
    try {
      setLoading(true)
      const ok = await checkAndRefreshAuth()
      if (!ok) {
        if (typeof window !== 'undefined') window.location.href = '/admin-login'
        return
      }
      const { token } = getAuthData()
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (supplierFilter) params.append('supplier_id', supplierFilter)
      const url = `/api/backend/v1/purchase-receipts?${params.toString()}`
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (data.success) {
        const receiptsList = data.data?.items || data.data || []
        setReceipts(receiptsList)
        if (data.data.pagination) {
          setPagination({
            total: data.data.pagination.total,
            per_page: data.data.pagination.per_page,
            current_page: data.data.pagination.current_page,
            last_page: data.data.pagination.last_page,
            from: data.data.pagination.from ?? (page - 1) * limit + 1,
            to: data.data.pagination.to ?? Math.min(page * limit, data.data.pagination.total)
          })
        } else setPagination(null)
      } else {
        toast.error(data.message || t('failedToFetchPurchaseReceipts'))
      }
    } catch (error) {
      toast.error(t('failedToFetchPurchaseReceipts'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { setPage(1) }, [statusFilter, supplierFilter])
  useEffect(() => { fetchReceipts() }, [page, statusFilter, supplierFilter])

  // Filter receipts
  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = 
      receipt.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.receipt_id.toString().includes(searchTerm)
    return matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getReceiptStats = () => {
    const stats = {
      total: pagination?.total ?? receipts.length,
      pending: receipts.filter(r => r.status === 'pending').length,
      confirmed: receipts.filter(r => r.status === 'confirmed').length,
      cancelled: receipts.filter(r => r.status === 'cancelled').length,
      total_amount: receipts.filter(r => r.status === 'confirmed').reduce((sum, r) => sum + r.total_amount, 0)
    }
    return stats
  }

  const stats = getReceiptStats()

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

  const handleConfirm = async (receiptId: number) => {
    try {
      const ok = await checkAndRefreshAuth()
      if (!ok) {
        if (typeof window !== 'undefined') window.location.href = '/admin-login'
        return
      }
      const { token } = getAuthData()
      
      const response = await fetch(`/api/backend/v1/purchase-receipts/confirm?id=${receiptId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(t('receiptConfirmedAndStockUpdated'))
        fetchReceipts()
      } else {
        toast.error(data.message || t('failedToConfirmReceipt'))
      }
    } catch (error) {
      console.error('Error confirming receipt:', error)
      toast.error(t('failedToConfirmReceipt'))
    }
  }

  // Add Receipt
  const handleAddClick = () => {
    setSelectedReceipt(null)
    setIsAddEditModalOpen(true)
  }

  // Edit Receipt (chỉ pending)
  const handleEditClick = (receipt: PurchaseReceipt) => {
    if (receipt.status !== 'pending') {
      toast.error(t('canOnlyEditPendingReceipts'))
      return
    }
    setSelectedReceipt(receipt)
    setIsAddEditModalOpen(true)
  }

  // View Details
  const handleViewDetails = (receipt: PurchaseReceipt) => {
    setSelectedReceipt(receipt)
    setIsDetailModalOpen(true)
  }

  // Delete Receipt
  const handleDeleteClick = (receipt: PurchaseReceipt) => {
    if (receipt.status === 'confirmed') {
      toast.error(t('cannotDeleteConfirmedReceipts'))
      return
    }
    setDeletingReceipt(receipt)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingReceipt) return
    
    try {
      const ok = await checkAndRefreshAuth()
      if (!ok) {
        if (typeof window !== 'undefined') window.location.href = '/admin-login'
        return
      }
      const { token } = getAuthData()
      
      const response = await fetch(`/api/backend/v1/purchase-receipts?id=${deletingReceipt.receipt_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(t('receiptDeleted'))
        fetchReceipts()
        setIsDeleteModalOpen(false)
        setDeletingReceipt(null)
      } else {
        toast.error(data.message || t('failedToDeleteReceipt'))
      }
    } catch (error) {
      console.error('Error deleting receipt:', error)
      toast.error(t('failedToDeleteReceipt'))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="admin-page-title mb-2">{t('purchaseReceiptManagement')}</h1>
            <p className="admin-page-description">{t('purchaseReceiptManagementDesc')}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            <span className="text-sm font-medium text-slate-600 mr-1 hidden sm:inline">{t('view')}:</span>
            <div className="flex rounded-lg border border-slate-200 bg-white/80 overflow-hidden">
              <Button variant="ghost" size="sm" onClick={() => setViewModeAndStore('list')} className={`rounded-none ${viewMode === 'list' ? 'bg-slate-100' : ''}`} title={t('viewList')}><LayoutList className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => setViewModeAndStore('grid')} className={`rounded-none ${viewMode === 'grid' ? 'bg-slate-100' : ''}`} title={t('viewGrid')}><LayoutGrid className="h-4 w-4" /></Button>
            </div>
            <Button variant="outline" onClick={fetchReceipts} disabled={loading} className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('refresh')}
            </Button>
            <Button onClick={handleAddClick} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('createReceipt')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[auto_1fr_1fr_1fr_1fr] gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 order-first w-fit max-w-full">
            <CardContent className="p-6 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-600 mb-1">{t('receiptTotalRevenue')}</p>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600 whitespace-nowrap">{formatCurrency(stats.total_amount)}</p>
              </div>
              <div className="h-12 w-12 shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('receiptTotalReceipts')}</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('pending')}</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.pending}</p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg shrink-0">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('confirmed')}</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.confirmed}</p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('cancelled')}</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.cancelled}</p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
                  <XCircle className="h-6 w-6 text-white" />
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
                      placeholder={t('searchReceiptsPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">{t('statusFilter')}</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="min-w-[170px] border-slate-200 bg-white/50 focus:bg-white">
                      <SelectValue placeholder={t('allStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allStatus')}</SelectItem>
                      <SelectItem value="pending">{t('pending')}</SelectItem>
                      <SelectItem value="confirmed">{t('confirmed')}</SelectItem>
                      <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-slate-600">{t('loadingPurchaseReceipts')}</p>
            </CardContent>
          </Card>
        ) : filteredReceipts.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">{t('noPurchaseReceiptsFound')}</h3>
              <p className="text-slate-500">{t('noPurchaseReceiptsMatch')}</p>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReceipts.map((receipt) => (
              <Card key={receipt.receipt_id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">#{receipt.receipt_id}</h3>
                        <p className="text-sm text-slate-600 flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{receipt.supplier_name}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`${getStatusColor(receipt.status)}`}>{getStatusIcon(receipt.status)}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">{t('itemsCountSuffix', { count: String(receipt.item_count) })} · {formatCurrency(receipt.total_amount)}</p>
                  <p className="text-xs text-slate-400 mt-2">{formatDate(receipt.created_at)}</p>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(receipt)} className="flex-1 bg-white/80 border-slate-200 hover:bg-white"><Eye className="h-4 w-4 mr-1" />{t('view')}</Button>
                    {receipt.status === 'pending' && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleEditClick(receipt)} className="bg-white/80 border-slate-200 hover:bg-white"><Edit className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => handleConfirm(receipt.receipt_id)} className="text-green-600 border-green-200"><CheckCircle className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteClick(receipt)} className="text-red-600 border-red-200"><Trash2 className="h-4 w-4" /></Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">{t('receiptIdHeader')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">{t('receiptSupplierHeader')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">{t('receiptItemsHeader')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">{t('receiptTotalAmountHeader')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">{t('receiptStatusHeader')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">{t('receiptCreatedHeader')}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {filteredReceipts.map((receipt) => (
                      <tr key={receipt.receipt_id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          #{receipt.receipt_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            {receipt.supplier_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {t('itemsCountSuffix', { count: String(receipt.item_count) })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          {formatCurrency(receipt.total_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={`flex items-center gap-1 w-fit ${getStatusColor(receipt.status)}`}
                          >
                            {getStatusIcon(receipt.status)}
                            {receipt.status === 'pending' ? t('pending') : receipt.status === 'confirmed' ? t('confirmed') : t('cancelled')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {formatDate(receipt.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(receipt)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {receipt.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditClick(receipt)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleConfirm(receipt.receipt_id)}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClick(receipt)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && pagination && pagination.last_page > 1 && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mt-4">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-slate-600">
                {t('showingXOfY', { from: String(pagination.from), to: String(pagination.to), total: String(pagination.total) })}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pagination.current_page <= 1} className="bg-white/80 border-slate-200 hover:bg-white">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-slate-700 min-w-[120px] text-center">
                  {t('pageOf', { current: String(pagination.current_page), total: String(pagination.last_page) })}
                </span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))} disabled={pagination.current_page >= pagination.last_page} className="bg-white/80 border-slate-200 hover:bg-white">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modals */}
        <PurchaseReceiptModal
          isOpen={isAddEditModalOpen}
          onClose={() => setIsAddEditModalOpen(false)}
          receipt={selectedReceipt}
          onSaved={() => {
            setIsAddEditModalOpen(false)
            fetchReceipts()
          }}
        />

        <PurchaseReceiptDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          receipt={selectedReceipt}
          onConfirmed={() => {
            setIsDetailModalOpen(false)
            fetchReceipts()
          }}
        />

        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          title={t('deletePurchaseReceipt')}
          description={t('deletePurchaseReceiptConfirm', { id: String(deletingReceipt?.receipt_id ?? '') })}
          confirmText={t('delete')}
        />
      </div>
    </div>
  )
}

