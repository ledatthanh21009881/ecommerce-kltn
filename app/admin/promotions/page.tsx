'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import ConfirmModal from '@/components/ui/confirm-modal'
import { Plus, Edit, Trash2, Search, RefreshCw, Tag, Percent, DollarSign, Calendar, LayoutList, LayoutGrid, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react'
import { getAuthData } from '@/lib/admin-auth'
import { useLanguage } from '@/contexts/LanguageContext'

interface Voucher {
  voucher_id: number
  code: string
  discount_type: 'percent' | 'amount'
  discount_amount: number
  min_order_total: number
  max_usage: number
  start_date: string
  end_date: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export default function PromotionsPage() {
  const { t } = useLanguage()
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingVoucherId, setDeletingVoucherId] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [pagination, setPagination] = useState<{ total: number; current_page: number; last_page: number; from: number; to: number } | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('admin_promotions_view') as 'list' | 'grid') || 'list'
    return 'list'
  })
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percent' as 'percent' | 'amount',
    discount_amount: '',
    min_order_total: '',
    max_usage: '',
    start_date: '',
    end_date: '',
    status: 'active'
  })

  // Use Next.js proxy API instead of direct backend calls

  const setViewModeAndStore = (mode: 'list' | 'grid') => {
    setViewMode(mode)
    if (typeof window !== 'undefined') localStorage.setItem('admin_promotions_view', mode)
  }

  useEffect(() => {
    fetchVouchers()
  }, [page, statusFilter, typeFilter, searchTerm])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, typeFilter, searchTerm])

  const fetchVouchers = async () => {
    try {
      setLoading(true)
      const { token } = getAuthData()
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (searchTerm) params.set('search', searchTerm)
      const response = await fetch(`/api/backend/v1/vouchers?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      if (data.success) {
        setVouchers(data.data?.items || data.data || [])
        if (data.data?.pagination) {
          setPagination({
            total: data.data.pagination.total,
            current_page: data.data.pagination.current_page,
            last_page: data.data.pagination.last_page,
            from: data.data.pagination.from ?? (page - 1) * limit + 1,
            to: data.data.pagination.to ?? Math.min(page * limit, data.data.pagination.total)
          })
        } else {
          setPagination(null)
        }
      } else {
        toast.error(data.message || t('failedToFetchVouchers'))
      }
    } catch (error) {
      console.error('Error fetching vouchers:', error)
      toast.error(t('errorFetchingVouchers'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { token } = getAuthData()
      
      const url = editingVoucher 
        ? `/api/backend/v1/vouchers/${editingVoucher.voucher_id}`
        : '/api/backend/v1/vouchers'
      
      const method = editingVoucher ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          discount_amount: parseFloat(formData.discount_amount),
          min_order_total: parseFloat(formData.min_order_total),
          max_usage: parseInt(formData.max_usage)
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success(editingVoucher ? t('voucherUpdatedSuccessfully') : t('voucherCreatedSuccessfully'))
        setShowForm(false)
        setEditingVoucher(null)
        resetForm()
        fetchVouchers()
      } else {
        toast.error(data.message || t('failedToSaveVoucher'))
      }
    } catch (error) {
      console.error('Error saving voucher:', error)
      toast.error(t('errorSavingVoucher'))
    }
  }

  const handleEdit = (voucher: Voucher) => {
    setEditingVoucher(voucher)
    setFormData({
      code: voucher.code,
      discount_type: voucher.discount_type,
      discount_amount: voucher.discount_amount.toString(),
      min_order_total: voucher.min_order_total.toString(),
      max_usage: voucher.max_usage.toString(),
      start_date: voucher.start_date,
      end_date: voucher.end_date,
      status: voucher.status
    })
    setShowForm(true)
  }

  const handleDelete = (voucherId: number) => {
    setDeletingVoucherId(voucherId)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!deletingVoucherId) return
    
    try {
      const { token } = getAuthData()
      
      const response = await fetch(`/api/backend/v1/vouchers/${deletingVoucherId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        toast.success(t('voucherDeletedSuccessfully'))
        fetchVouchers()
      } else {
        toast.error(data.message || t('failedToDeleteVoucher'))
      }
    } catch (error) {
      console.error('Error deleting voucher:', error)
      toast.error(t('errorDeletingVoucher'))
    } finally {
      setShowDeleteModal(false)
      setDeletingVoucherId(null)
    }
  }

  const resetForm = () => {
    setFormData({
      code: '',
      discount_type: 'percent',
      discount_amount: '',
      min_order_total: '',
      max_usage: '',
      start_date: '',
      end_date: '',
      status: 'active'
    })
  }

  const closeFormModal = () => {
    setShowForm(false)
    setEditingVoucher(null)
    resetForm()
  }

  const filteredVouchers = Array.isArray(vouchers) ? vouchers.filter(voucher => {
    const matchesSearch = voucher.code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || voucher.status === statusFilter
    const matchesType = typeFilter === 'all' || voucher.discount_type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  }) : []

  // Calculate stats
  const totalVouchers = vouchers.length
  const activeVouchers = vouchers.filter(v => v.status === 'active').length
  const inactiveVouchers = vouchers.filter(v => v.status === 'inactive').length
  const percentageVouchers = vouchers.filter(v => v.discount_type === 'percent').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">{t('loadingPromotions')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="admin-page-title mb-2">{t('promotionsManagement')}</h1>
            <p className="admin-page-description">{t('promotionsManagementDesc')}</p>
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
            <Button variant="outline" onClick={fetchVouchers} disabled={loading} className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('refresh')}
            </Button>
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('addVoucher')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-blue-500/15 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('totalVouchers')}</p>
                  <p className="text-3xl font-bold text-slate-900">{totalVouchers}</p>
                  <p className="text-xs text-slate-500 mt-1">{t('total')}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-700">
                  <Tag className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-500/15 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('active')}</p>
                  <p className="text-3xl font-bold text-slate-900">{activeVouchers}</p>
                  <p className="text-xs text-slate-500 mt-1">{t('onThisPage')}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-slate-500/15 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('inactive')}</p>
                  <p className="text-3xl font-bold text-slate-900">{inactiveVouchers}</p>
                  <p className="text-xs text-slate-500 mt-1">{t('onThisPage')}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-500/15 text-slate-700">
                  <XCircle className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-amber-500/15 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('percentage')}</p>
                  <p className="text-3xl font-bold text-slate-900">{percentageVouchers}</p>
                  <p className="text-xs text-slate-500 mt-1">{t('onThisPage')}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700">
                  <Percent className="h-4 w-4" />
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
                      placeholder={t('searchVouchers')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">{t('statusFilter')}</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="min-w-[160px] border-slate-200 bg-white/50 focus:bg-white">
                      <SelectValue placeholder={t('statusFilter')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all')}</SelectItem>
                      <SelectItem value="active">{t('active')}</SelectItem>
                      <SelectItem value="inactive">{t('inactive')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">{t('type')}</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="min-w-[160px] border-slate-200 bg-white/50 focus:bg-white">
                      <SelectValue placeholder={t('type')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('all')}</SelectItem>
                      <SelectItem value="percent">{t('percentage')}</SelectItem>
                      <SelectItem value="amount">{t('fixedAmount')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeFormModal() }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingVoucher ? t('editVoucher') : t('addNewVoucher')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">{t('code')}</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="discount_type">{t('discountType')}</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(value: 'percent' | 'amount') => setFormData({ ...formData, discount_type: value })}
                >
                  <SelectTrigger id="discount_type" className="w-full border-gray-200 bg-white">
                    <SelectValue placeholder={t('discountType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">{t('percentage')}</SelectItem>
                    <SelectItem value="amount">{t('fixedAmount')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="discount_amount">{t('discountAmount')}</Label>
                <Input
                  id="discount_amount"
                  type="number"
                  step="0.01"
                  value={formData.discount_amount}
                  onChange={(e) => setFormData({...formData, discount_amount: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="min_order_total">{t('minimumOrderTotal')}</Label>
                <Input
                  id="min_order_total"
                  type="number"
                  step="0.01"
                  value={formData.min_order_total}
                  onChange={(e) => setFormData({...formData, min_order_total: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="start_date">{t('startDate')}</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end_date">{t('endDate')}</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch">
              <div className="space-y-2">
                <Label htmlFor="max_usage">{t('maximumUses')}</Label>
                <Input
                  id="max_usage"
                  type="number"
                  value={formData.max_usage}
                  onChange={(e) => setFormData({...formData, max_usage: e.target.value})}
                  required
                />
              </div>
              <div className="flex flex-col justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5 min-w-0 pr-2">
                  <Label htmlFor="voucher-active" className="text-sm font-medium text-slate-900">
                    {t('active')}
                  </Label>
                  <p className="text-sm text-slate-600">
                    {t('activeVoucherDescription')}
                  </p>
                </div>
                <Switch
                  id="voucher-active"
                  checked={formData.status === 'active'}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, status: checked ? 'active' : 'inactive' })
                  }
                  className="shrink-0"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={closeFormModal}>
                {t('cancel')}
              </Button>
              <Button type="submit" className="flex items-center gap-2">
                {editingVoucher ? t('update') : t('create')} {t('voucher')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg animate-pulse">
                    <div className="h-10 w-10 bg-slate-200 rounded" />
                    <div className="flex-1">
                      <div className="h-4 bg-slate-200 rounded mb-2" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 w-8 bg-slate-200 rounded" />
                      <div className="h-8 w-8 bg-slate-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredVouchers.length === 0 ? (
              <div className="text-center py-12">
                <Tag className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">{t('noVouchersFound')}</h3>
                <p className="text-slate-600">{t('getStartedByCreatingVoucher')}</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVouchers.map((voucher) => (
                  <Card key={voucher.voucher_id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-10 w-10 shrink-0 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                            <Tag className="h-5 w-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-slate-900 truncate">{voucher.code}</h3>
                            <p className="text-xs text-slate-500">
                              {voucher.discount_type === 'percent' ? `${voucher.discount_amount}%` : `${voucher.discount_amount.toLocaleString()}đ`}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className={voucher.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200'}>
                          {voucher.status === 'active' ? t('active') : t('inactive')}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">{t('minimumOrderTotal')}: {voucher.min_order_total.toLocaleString()}đ · {t('maximumUses')}: {voucher.max_usage}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(voucher.start_date).toLocaleDateString()} – {new Date(voucher.end_date).toLocaleDateString()}</p>
                      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(voucher)} className="flex-1 bg-white/80 border-slate-200 hover:bg-white"><Edit className="h-4 w-4 mr-1" />{t('edit')}</Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(voucher.voucher_id)} className="text-red-600 border-red-200 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="w-[20%] text-left py-3 px-4 font-medium text-gray-900">{t('code')}</th>
                      <th className="w-[13%] text-left py-3 px-4 font-medium text-gray-900">{t('discountType')}</th>
                      <th className="w-[13%] text-left py-3 px-4 font-medium text-gray-900">{t('discountAmount')}</th>
                      <th className="w-[14%] text-left py-3 px-4 font-medium text-gray-900">{t('minimumOrderTotal')}</th>
                      <th className="w-[10%] text-left py-3 px-4 font-medium text-gray-900">{t('maximumUses')}</th>
                      <th className="w-[20%] text-left py-3 px-4 font-medium text-gray-900">{t('validPeriod')}</th>
                      <th className="w-[5%] text-left py-3 px-4 font-medium text-gray-900 whitespace-nowrap">{t('status')}</th>
                      <th className="w-[5%] text-left py-3 px-4 font-medium text-gray-900 whitespace-nowrap">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVouchers.map((voucher) => (
                      <tr key={voucher.voucher_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4 min-w-[220px]">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-blue-100 rounded flex items-center justify-center">
                              <Tag className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{voucher.code}</div>
                              <div className="text-sm text-gray-500">ID: {voucher.voucher_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <Badge variant="outline">
                            {voucher.discount_type === 'percent' ? t('percentage') : t('fixedAmount')}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="font-medium text-gray-900">
                            {voucher.discount_amount}
                            {voucher.discount_type === 'percent' ? '%' : 'đ'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-600 whitespace-nowrap">
                          {voucher.min_order_total.toLocaleString()}đ
                        </td>
                        <td className="py-4 px-4 text-gray-600 whitespace-nowrap">
                          {voucher.max_usage}
                        </td>
                        <td className="py-4 px-4 min-w-[220px] whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>
                              {new Date(voucher.start_date).toLocaleDateString()} - {new Date(voucher.end_date).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={`whitespace-nowrap ${voucher.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                          >
                            {voucher.status === 'active' ? t('active') : t('inactive')}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(voucher)}
                              className="bg-white/80 border-slate-200 hover:bg-white"
                              title={t('edit')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(voucher.voucher_id)}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              title={t('delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

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
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setDeletingVoucherId(null)
        }}
        onConfirm={confirmDelete}
        title={t('deleteVoucher')}
        description={t('deleteVoucherConfirm')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
      />
    </div>
  )
}
