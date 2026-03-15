'use client'

import { useState, useEffect } from 'react'
import { Search, RefreshCw, Building2, Phone, Mail, MapPin, Plus, Edit, Eye, Trash2, LayoutList, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getAuthData } from '@/lib/admin-auth'
import { useLanguage } from '@/contexts/LanguageContext'
import SupplierModal from '@/components/admin/SupplierModal'
import SupplierDetailModal from '@/components/admin/SupplierDetailModal'
import ConfirmModal from '@/components/ui/confirm-modal'

interface Supplier {
  supplier_id: number
  supplier_name: string
  contact_name?: string
  email?: string
  phone?: string
  address?: string
  status: string
  created_at: string
  updated_at?: string
}

export default function AdminSuppliersPage() {
  const { t } = useLanguage()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(12)
  const [pagination, setPagination] = useState<{ total: number; per_page: number; current_page: number; last_page: number; from: number; to: number } | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('admin_suppliers_view') as 'list' | 'grid') || 'grid'
    return 'grid'
  })
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null)

  const setViewModeAndStore = (mode: 'list' | 'grid') => {
    setViewMode(mode)
    if (typeof window !== 'undefined') localStorage.setItem('admin_suppliers_view', mode)
  }

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const { token } = getAuthData()
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter) params.append('status', statusFilter)
      const url = `/api/backend/v1/suppliers?${params.toString()}`
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (data.success) {
        const suppliersList = data.data?.items || data.data || []
        setSuppliers(suppliersList)
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
        toast.error(data.message || t('failedToFetchSuppliers'))
      }
    } catch (error) {
      toast.error(t('errorFetchingSuppliers'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { setPage(1) }, [searchTerm, statusFilter])
  useEffect(() => { fetchSuppliers() }, [page, searchTerm, statusFilter])

  // Filter suppliers (now handled by backend API, but keep for client-side if needed)
  const filteredSuppliers = suppliers

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'suspended':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSupplierStats = () => {
    const stats = {
      total: pagination?.total ?? suppliers.length,
      active: suppliers.filter(s => s.status === 'active').length,
      inactive: suppliers.filter(s => s.status === 'inactive').length,
      suspended: suppliers.filter(s => s.status === 'suspended').length
    }
    return stats
  }

  const stats = getSupplierStats()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Add Supplier
  const handleAddClick = () => {
    setSelectedSupplier(null)
    setIsAddEditModalOpen(true)
  }

  // Edit Supplier
  const handleEditClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setIsAddEditModalOpen(true)
  }

  // View Details
  const handleViewDetails = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setIsDetailModalOpen(true)
  }

  // Delete Supplier
  const handleDeleteClick = (supplier: Supplier) => {
    setDeletingSupplier(supplier)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingSupplier) return
    
    try {
      const { token } = getAuthData()
      const response = await fetch(`/api/backend/v1/suppliers?id=${deletingSupplier.supplier_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(t('supplierDeletedSuccessfully'))
        fetchSuppliers()
      } else {
        toast.error(data.message || t('failedToDeleteSupplier'))
      }
    } catch (error) {
      console.error('Error deleting supplier:', error)
      toast.error(t('failedToDeleteSupplier'))
    } finally {
      setIsDeleteModalOpen(false)
      setDeletingSupplier(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-2">{t('supplierManagement')}</h1>
            <p className="text-slate-600">{t('suppliersPageDesc')}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            <span className="text-sm font-medium text-slate-600 mr-1 hidden sm:inline">{t('view')}:</span>
            <div className="flex rounded-lg border border-slate-200 bg-white/80 overflow-hidden">
              <Button variant="ghost" size="sm" onClick={() => setViewModeAndStore('list')} className={`rounded-none ${viewMode === 'list' ? 'bg-slate-100' : ''}`} title={t('viewList')}><LayoutList className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => setViewModeAndStore('grid')} className={`rounded-none ${viewMode === 'grid' ? 'bg-slate-100' : ''}`} title={t('viewGrid')}><LayoutGrid className="h-4 w-4" /></Button>
            </div>
            <Button variant="outline" onClick={fetchSuppliers} disabled={loading} className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('refresh')}
            </Button>
            <Button onClick={handleAddClick} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
              <Plus className="h-4 w-4" />
              {t('addSupplier')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('totalSuppliers')}</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                  <p className="text-xs text-slate-500 mt-1">{t('total')}</p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('supplierStatusActive')}</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.active}</p>
                  <p className="text-xs text-slate-500 mt-1">{t('onThisPage')}</p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('supplierStatusInactive')}</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.inactive}</p>
                  <p className="text-xs text-slate-500 mt-1">{t('onThisPage')}</p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('supplierStatusSuspended')}</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.suspended}</p>
                  <p className="text-xs text-slate-500 mt-1">{t('onThisPage')}</p>
                </div>
                <div className="h-12 w-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Building2 className="h-6 w-6 text-white" />
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
                      placeholder={t('searchSuppliersPlaceholder')}
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
                    <option value="">{t('allStatus')}</option>
                    <option value="active">{t('supplierStatusActive')}</option>
                    <option value="inactive">{t('supplierStatusInactive')}</option>
                    <option value="suspended">{t('supplierStatusSuspended')}</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Suppliers List / Grid */}
        {loading ? (
          <div className={viewMode === 'list' ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}>
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">{t('noSuppliersFound')}</h3>
              <p className="text-slate-500">{t('noSuppliersMatch')}</p>
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          <div className="space-y-4">
            {filteredSuppliers.map((supplier) => (
              <Card key={supplier.supplier_id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
                        <Building2 className="h-6 w-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900">{supplier.supplier_name}</h3>
                        {supplier.contact_name && <p className="text-sm text-slate-600">{supplier.contact_name}</p>}
                        {supplier.email && <p className="text-xs text-slate-500 truncate">{supplier.email}</p>}
                      </div>
                      <Badge variant="outline" className={`shrink-0 ${getStatusColor(supplier.status)}`}>
                        {supplier.status === 'active' ? t('supplierStatusActive') : supplier.status === 'inactive' ? t('supplierStatusInactive') : t('supplierStatusSuspended')}
                      </Badge>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => handleEditClick(supplier)} className="bg-white/80 border-slate-200 hover:bg-white"><Edit className="h-4 w-4 mr-1" />{t('edit')}</Button>
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(supplier)} className="bg-white/80 border-slate-200 hover:bg-white"><Eye className="h-4 w-4 mr-1" />{t('view')}</Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteClick(supplier)} className="text-red-600 border-red-200 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSuppliers.map((supplier) => (
              <Card key={supplier.supplier_id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {supplier.supplier_name}
                        </h3>
                        {supplier.contact_name && (
                          <p className="text-sm text-gray-600">{t('contactLabel')}: {supplier.contact_name}</p>
                        )}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`flex items-center gap-1 ${getStatusColor(supplier.status)}`}
                      >
                        {supplier.status === 'active' ? t('supplierStatusActive') : supplier.status === 'inactive' ? t('supplierStatusInactive') : t('supplierStatusSuspended')}
                      </Badge>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-2 text-sm">
                      {supplier.email && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{supplier.email}</span>
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="h-4 w-4" />
                          <span>{supplier.phone}</span>
                        </div>
                      )}
                      {supplier.address && (
                        <div className="flex items-start gap-2 text-gray-600">
                          <MapPin className="h-4 w-4 mt-0.5" />
                          <span className="text-sm">{supplier.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Stats - Removed product_count and total_orders as they're not in current schema */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building2 className="h-4 w-4" />
                        <span>{t('idLabel')}: {supplier.supplier_id}</span>
                      </div>
                    </div>

                    {/* Timestamps */}
                    <div className="text-xs text-gray-400">
                      {t('addedLabel')}: {formatDate(supplier.created_at)}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(supplier)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        {t('edit')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(supplier)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {t('view')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(supplier)}
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
        <SupplierModal
          isOpen={isAddEditModalOpen}
          onClose={() => setIsAddEditModalOpen(false)}
          supplier={selectedSupplier}
          onSaved={() => {
            setIsAddEditModalOpen(false)
            fetchSuppliers()
          }}
        />

        <SupplierDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          supplier={selectedSupplier}
        />

        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          title={t('deleteSupplier')}
          description={t('deleteSupplierConfirm', { name: deletingSupplier?.supplier_name || '' })}
          confirmText={t('delete')}
        />
      </div>
    </div>
  )
}
