'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, RefreshCw, Truck, Edit, Trash2, DollarSign, Clock, Calendar, AlertTriangle } from 'lucide-react'
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

  // Calculate stats
  const totalMethods = methods.length
  const activeMethods = methods.filter(m => m.is_active).length
  const inactiveMethods = methods.filter(m => !m.is_active).length
  const averageFee = methods.length > 0 ? methods.reduce((sum, m) => sum + m.fee, 0) / methods.length : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('shippingManagement')}</h1>
          <p className="text-slate-600">{t('shippingManagementDesc')}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('totalShippingMethods')}</p>
                  <p className="text-2xl font-bold text-slate-900">{totalMethods}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Truck className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('activeShippingMethods')}</p>
                  <p className="text-2xl font-bold text-green-600">{activeMethods}</p>
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
                  <p className="text-sm font-medium text-slate-600">{t('inactiveShippingMethods')}</p>
                  <p className="text-2xl font-bold text-red-600">{inactiveMethods}</p>
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
                  <p className="text-sm font-medium text-slate-600">{t('averageShippingFee')}</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {averageFee.toLocaleString()}đ
                  </p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-orange-600" />
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
                    placeholder={t('searchShippingMethods')}
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
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={fetchMethods}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  {t('refresh')}
                </Button>
                <Button
                  onClick={handleAddMethod}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  {t('addShippingMethod')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Methods Table */}
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
            ) : filteredMethods.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noShippingMethodsFound')}</h3>
                <p className="text-gray-600">{t('getStartedByCreatingShippingMethod')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">{t('shippingMethodName')}</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">{t('shippingFee')}</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">{t('estimatedDays')}</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">{t('deliveryTime')}</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">{t('status')}</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMethods.map((method) => (
                      <tr key={method.shipping_method_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-blue-100 rounded flex items-center justify-center">
                              <Truck className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{method.name}</div>
                              <div className="text-sm text-gray-500">ID: {method.shipping_method_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            <span className="font-medium text-gray-900">
                              {method.fee.toLocaleString()}đ
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-600">
                          {method.estimated_days}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <div className="text-sm">
                              <div>{method.estimated_days} {t('days')}</div>
                              <div className="text-gray-500">
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
                              className="bg-white text-gray-900 hover:bg-gray-100"
                              title={t('edit')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(method.shipping_method_id)}
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