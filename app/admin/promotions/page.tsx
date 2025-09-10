'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import ConfirmModal from '@/components/ui/confirm-modal'
import { Plus, Edit, Trash2, Search, Filter, RefreshCw, Tag, Percent, DollarSign, Calendar } from 'lucide-react'
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

  useEffect(() => {
    fetchVouchers()
  }, [])

  const fetchVouchers = async () => {
    try {
      setLoading(true)
      const { token } = getAuthData()
      
      const response = await fetch('/api/backend/v1/vouchers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      console.log('Vouchers API Response:', data)
      
      if (data.success) {
        setVouchers(data.data?.items || data.data || [])
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loadingPromotions')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('promotionsManagement')}</h1>
          <p className="text-slate-600">{t('promotionsManagementDesc')}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('totalVouchers')}</p>
                  <p className="text-2xl font-bold text-slate-900">{totalVouchers}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Tag className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('active')}</p>
                  <p className="text-2xl font-bold text-green-600">{activeVouchers}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-xl">✅</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('inactive')}</p>
                  <p className="text-2xl font-bold text-red-600">{inactiveVouchers}</p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 text-xl">❌</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('percentage')}</p>
                  <p className="text-2xl font-bold text-orange-600">{percentageVouchers}</p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Percent className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="bg-white shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col lg:flex-row gap-4 flex-1 w-full">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder={t('searchVouchers')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex-1 max-w-xs">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">{t('all')}</option>
                    <option value="active">{t('active')}</option>
                    <option value="inactive">{t('inactive')}</option>
                  </select>
                </div>

                {/* Type Filter */}
                <div className="flex-1 max-w-xs">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">{t('all')}</option>
                    <option value="percent">{t('percentage')}</option>
                    <option value="amount">{t('fixedAmount')}</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={fetchVouchers}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  {t('refresh')}
                </Button>
                <Button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  {t('addVoucher')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingVoucher ? t('editVoucher') : t('addNewVoucher')}</CardTitle>
          </CardHeader>
          <CardContent>
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
                  <select
                    id="discount_type"
                    value={formData.discount_type}
                    onChange={(e) => setFormData({...formData, discount_type: e.target.value as 'percent' | 'amount'})}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="percent">{t('percentage')}</option>
                    <option value="amount">{t('fixedAmount')}</option>
                  </select>
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
                  <Label htmlFor="max_usage">{t('maximumUses')}</Label>
                  <Input
                    id="max_usage"
                    type="number"
                    value={formData.max_usage}
                    onChange={(e) => setFormData({...formData, max_usage: e.target.value})}
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
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="status"
                  checked={formData.status === 'active'}
                  onChange={(e) => setFormData({...formData, status: e.target.checked ? 'active' : 'inactive'})}
                />
                <Label htmlFor="status">{t('active')}</Label>
              </div>
              <div className="flex space-x-2">
                <Button type="submit">
                  {editingVoucher ? t('update') : t('create')} {t('voucher')}
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setShowForm(false)
                  setEditingVoucher(null)
                  resetForm()
                }}>
                  {t('cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

        {/* Vouchers Table */}
        <Card className="bg-white shadow-sm">
          <CardContent className="p-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg animate-pulse">
                    <div className="h-10 w-10 bg-gray-200 rounded"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 w-8 bg-gray-200 rounded"></div>
                      <div className="h-8 w-8 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredVouchers.length === 0 ? (
              <div className="text-center py-12">
                <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noVouchersFound')}</h3>
                <p className="text-gray-600">{t('getStartedByCreatingVoucher')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">{t('code')}</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">{t('discountType')}</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">{t('discountAmount')}</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">{t('minimumOrderTotal')}</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">{t('maximumUses')}</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">{t('validPeriod')}</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">{t('status')}</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVouchers.map((voucher) => (
                      <tr key={voucher.voucher_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
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
                        <td className="py-4 px-4">
                          <Badge variant="outline">
                            {voucher.discount_type === 'percent' ? t('percentage') : t('fixedAmount')}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            {voucher.discount_type === 'percent' ? (
                              <Percent className="h-4 w-4 text-blue-500" />
                            ) : (
                              <DollarSign className="h-4 w-4 text-green-500" />
                            )}
                            <span className="font-medium text-gray-900">
                              {voucher.discount_amount}
                              {voucher.discount_type === 'percent' ? '%' : 'đ'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-600">
                          {voucher.min_order_total.toLocaleString()}đ
                        </td>
                        <td className="py-4 px-4 text-gray-600">
                          {voucher.max_usage}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <div className="text-sm">
                              <div>{new Date(voucher.start_date).toLocaleDateString()}</div>
                              <div className="text-gray-500">to {new Date(voucher.end_date).toLocaleDateString()}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant={voucher.status === 'active' ? 'default' : 'secondary'}>
                            {voucher.status === 'active' ? t('active') : t('inactive')}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleEdit(voucher)}
                              className="bg-white text-gray-900 hover:bg-gray-100"
                              title={t('edit')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(voucher.voucher_id)}
                              className="bg-red-600 hover:bg-red-700"
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
