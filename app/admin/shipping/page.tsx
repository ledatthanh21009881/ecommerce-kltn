'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, RefreshCw, Truck, Edit, Trash2, DollarSign, Clock, Calendar, AlertTriangle, LayoutList, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import ConfirmModal from '@/components/ui/confirm-modal'
import ShippingModal from '@/components/admin/ShippingModal'
import { getAuthData } from '@/lib/admin-auth'
import { useLanguage } from '@/contexts/LanguageContext'

interface ShippingMethod {
  shipping_method_id: number
  name: string
  fee: number
  estimated_days: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function AdminShippingPage() {
  const { t } = useLanguage()
  const [methods, setMethods] = useState<ShippingMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMethod, setEditingMethod] = useState<ShippingMethod | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletingMethodId, setDeletingMethodId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [limit] = useState(12)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('admin_shipping_view') as 'list' | 'grid') || 'list'
    return 'list'
  })

  const setViewModeAndStore = (mode: 'list' | 'grid') => {
    setViewMode(mode)
    if (typeof window !== 'undefined') localStorage.setItem('admin_shipping_view', mode)
  }

  // Fetch shipping methods
  const fetchMethods = async () => {
    try {
      setLoading(true)
      const { token } = getAuthData()
      
      const url = '/api/backend/v1/shipping'
      console.log('🌐 Fetching shipping methods from:', url)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      console.log('Shipping methods API Response:', data)
      
      if (data.success) {
        setMethods(data.data || [])
        console.log('Methods set:', data.data)
      } else {
        console.error('API Error:', data)
        toast.error(data.message || t('failedToFetch'))
      }
    } catch (error) {
      console.error('Fetch Shipping Methods Error:', error)
      toast.error(t('errorFetching'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMethods()
  }, [])

  const handleAddMethod = () => {
    setEditingMethod(null)
    setIsModalOpen(true)
  }

  const handleEdit = (method: ShippingMethod) => {
    setEditingMethod(method)
    setIsModalOpen(true)
  }

  const handleDelete = (id: number) => {
    setDeletingMethodId(id)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingMethodId) return

    try {
      const { token } = getAuthData()
      const response = await fetch(`/api/backend/v1/shipping/${deletingMethodId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success) {
        toast.success(t('shippingMethodDeleted'))
        fetchMethods()
      } else {
        toast.error(data.message || t('failedToDeleteShippingMethod'))
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(t('errorDeletingShippingMethod'))
    } finally {
      setIsDeleteModalOpen(false)
      setDeletingMethodId(null)
    }
  }

  const handleToggleStatus = async (id: number) => {
    try {
      const { token } = getAuthData()
      const response = await fetch(`/api/backend/v1/shipping/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success) {
        toast.success(t('shippingMethodUpdated'))
        fetchMethods()
      } else {
        toast.error(data.message || t('failedToUpdateShippingMethod'))
      }
    } catch (error) {
      console.error('Toggle status error:', error)
      toast.error(t('errorUpdatingShippingMethod'))
    }
  }

  const filteredMethods = methods.filter(method => {
    const matchesSearch = method.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && method.is_active) ||
      (statusFilter === 'inactive' && !method.is_active)
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.max(1, Math.ceil(filteredMethods.length / limit))
  const from = filteredMethods.length === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, filteredMethods.length)
  const paginatedMethods = filteredMethods.slice((page - 1) * limit, page * limit)

  useEffect(() => {
    setPage(1)
  }, [searchTerm, statusFilter])

  // Calculate stats
  const totalMethods = methods.length
  const activeMethods = methods.filter(m => m.is_active).length
  const inactiveMethods = methods.filter(m => !m.is_active).length
  const averageFee = methods.length > 0 ? methods.reduce((sum, m) => sum + m.fee, 0) / methods.length : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="admin-page-title mb-2">{t('shippingManagement')}</h1>
            <p className="admin-page-description">{t('shippingManagementDesc')}</p>
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
            <Button variant="outline" onClick={fetchMethods} disabled={loading} className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('refresh')}
            </Button>
            <Button onClick={handleAddMethod} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
              <Plus className="h-4 w-4" />
              {t('addShippingMethod')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('totalShippingMethods')}</p>
                  <p className="text-3xl font-bold text-slate-900">{totalMethods}</p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Truck className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('activeShippingMethods')}</p>
                  <p className="text-3xl font-bold text-slate-900">{activeMethods}</p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Truck className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('inactiveShippingMethods')}</p>
                  <p className="text-3xl font-bold text-slate-900">{inactiveMethods}</p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Truck className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('averageShippingFee')}</p>
                  <p className="text-3xl font-bold text-emerald-600">{averageFee.toLocaleString()}đ</p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
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
                  <label className="text-xs font-medium text-slate-600 mb-1">{t('search')}</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder={t('searchShippingMethods')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">{t('statusFilter')}</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/50 focus:bg-white min-w-[140px]"
                  >
                    <option value="all">{t('all')}</option>
                    <option value="active">{t('active')}</option>
                    <option value="inactive">{t('inactive')}</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
            ) : filteredMethods.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">{t('noShippingMethodsFound')}</h3>
                <p className="text-slate-600">{t('getStartedByCreatingShippingMethod')}</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedMethods.map((method) => (
                  <Card key={method.shipping_method_id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="h-10 w-10 bg-blue-100 rounded flex items-center justify-center">
                            <Truck className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{method.name}</div>
                            <div className="text-xs text-slate-500">ID: {method.shipping_method_id}</div>
                          </div>
                        </div>
                        <Badge variant={method.is_active ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => handleToggleStatus(method.shipping_method_id)}>
                          {method.is_active ? t('active') : t('inactive')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 mb-2">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        <span className="font-medium">{method.fee.toLocaleString()}đ</span>
                      </div>
                      <div className="text-sm text-slate-600 mb-3">
                        <Clock className="h-4 w-4 inline mr-1" />
                        {method.estimated_days} {t('days')} — {method.estimated_days === 1 ? t('sameDay') : method.estimated_days <= 2 ? t('express') : t('standard')}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(method)} className="flex-1"><Edit className="h-4 w-4" /></Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(method.shipping_method_id)} className="text-red-600 border-red-200 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
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
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('shippingMethodName')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('shippingFee')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('estimatedDays')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('deliveryTime')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('status')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMethods.map((method) => (
                      <tr key={method.shipping_method_id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-blue-100 rounded flex items-center justify-center">
                              <Truck className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{method.name}</div>
                              <div className="text-sm text-slate-500">ID: {method.shipping_method_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            <span className="font-medium text-slate-900">
                              {method.fee.toLocaleString()}đ
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-600">
                          {method.estimated_days}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-slate-400" />
                            <div className="text-sm">
                              <div>{method.estimated_days} {t('days')}</div>
                              <div className="text-slate-500">
                                {method.estimated_days === 1 ? t('sameDay') : 
                                 method.estimated_days <= 2 ? t('express') : 
                                 t('standard')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge 
                            variant={method.is_active ? 'default' : 'secondary'}
                            className="cursor-pointer"
                            onClick={() => handleToggleStatus(method.shipping_method_id)}
                          >
                            {method.is_active ? t('active') : t('inactive')}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleEdit(method)}
                              className="bg-white/80 border-slate-200 hover:bg-white"
                              title={t('edit')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(method.shipping_method_id)}
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

        {/* Pagination */}
        {!loading && filteredMethods.length > 0 && totalPages > 1 && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mt-6">
            <CardContent className="py-4 px-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-slate-600">
                  {t('showingXOfY', { from: String(from), to: String(to), total: String(filteredMethods.length) })}
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

      {/* Shipping Modal */}
      <ShippingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchMethods}
        editingMethod={editingMethod}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title={t('deleteShippingMethod')}
        message={t('areYouSureDeleteShippingMethod')}
        confirmText={t('delete')}
        cancelText={t('cancel')}
      />
    </div>
  )
}