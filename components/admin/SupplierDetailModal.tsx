'use client'

import { useState, useEffect } from 'react'
import { X, Building2, FileText, DollarSign, Package, Calendar, Mail, Phone, MapPin, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getAuthData } from '@/lib/admin-auth'
import { useLanguage } from '@/contexts/LanguageContext'

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

interface SupplierStats {
  total_receipts: number
  confirmed_receipts: number
  pending_receipts: number
  total_amount: number
  total_products: number
}

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

interface SupplierDetailModalProps {
  isOpen: boolean
  onClose: () => void
  supplier: Supplier | null
}

export default function SupplierDetailModal({ isOpen, onClose, supplier }: SupplierDetailModalProps) {
  const { t } = useLanguage()
  const [supplierData, setSupplierData] = useState<Supplier | null>(null)
  const [stats, setStats] = useState<SupplierStats | null>(null)
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([])
  const [loading, setLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [receiptsLoading, setReceiptsLoading] = useState(false)

  // Fetch supplier details
  const fetchSupplierDetails = async () => {
    if (!supplier) return

    try {
      setLoading(true)
      const { token } = getAuthData()
      
      const response = await fetch(`/api/backend/v1/suppliers?id=${supplier.supplier_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSupplierData(data.data)
      } else {
        toast.error(data.message || t('failedToFetchSupplierDetails'))
      }
    } catch (error) {
      console.error('Error fetching supplier details:', error)
      toast.error(t('failedToFetchSupplierDetails'))
    } finally {
      setLoading(false)
    }
  }

  // Fetch supplier stats
  const fetchSupplierStats = async () => {
    if (!supplier) return

    try {
      setStatsLoading(true)
      const { token } = getAuthData()
      
      const response = await fetch(`/api/backend/v1/suppliers/stats-detail?id=${supplier.supplier_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setStats(data.data)
      } else {
        toast.error(data.message || t('failedToFetchSupplierStats'))
      }
    } catch (error) {
      console.error('Error fetching supplier stats:', error)
      toast.error(t('failedToFetchSupplierStats'))
    } finally {
      setStatsLoading(false)
    }
  }

  // Fetch recent receipts
  const fetchRecentReceipts = async () => {
    if (!supplier) return

    try {
      setReceiptsLoading(true)
      const { token } = getAuthData()
      
      const response = await fetch(`/api/backend/v1/purchase-receipts?supplier_id=${supplier.supplier_id}&limit=5`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        const receiptsList = data.data?.items || data.data || []
        setReceipts(receiptsList)
      } else {
        toast.error(data.message || t('failedToFetchPurchaseReceipts'))
      }
    } catch (error) {
      console.error('Error fetching purchase receipts:', error)
      toast.error(t('failedToFetchPurchaseReceipts'))
    } finally {
      setReceiptsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && supplier) {
      fetchSupplierDetails()
      fetchSupplierStats()
      fetchRecentReceipts()
    }
  }, [isOpen, supplier])

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

  const getReceiptStatusColor = (status: string) => {
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

  const handleViewAllReceipts = () => {
    if (supplier) {
      window.open(`/admin/purchase-receipts?supplier_id=${supplier.supplier_id}`, '_blank')
    }
  }

  if (!isOpen || !supplier) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t('supplierDetails')}</h3>
              <p className="text-sm text-gray-600">
                {supplierData?.supplier_name || supplier.supplier_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">{t('basicInformation')}</h4>
            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ) : supplierData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{t('nameLabel')}:</span>
                    <span>{supplierData.supplier_name}</span>
                  </div>
                  {supplierData.contact_name && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t('contactLabel')}:</span>
                      <span>{supplierData.contact_name}</span>
                    </div>
                  )}
                  {supplierData.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{t('emailLabel')}:</span>
                      <span>{supplierData.email}</span>
                    </div>
                  )}
                  {supplierData.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{t('phoneLabel')}:</span>
                      <span>{supplierData.phone}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t('status')}:</span>
                    <Badge 
                      variant="outline" 
                      className={`${getStatusColor(supplierData.status)}`}
                    >
                      {supplierData.status === 'active' ? t('supplierStatusActive') : supplierData.status === 'inactive' ? t('supplierStatusInactive') : t('supplierStatusSuspended')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{t('createdLabel')}:</span>
                    <span>{formatDate(supplierData.created_at)}</span>
                  </div>
                  {supplierData.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <span className="font-medium">{t('addressLabel')}:</span>
                        <p className="text-sm text-gray-600 mt-1">{supplierData.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Statistics Cards */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">{t('statisticsTitle')}</h4>
            {statsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : stats ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-white shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{t('supplierTotalReceipts')}</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.total_receipts}</p>
                      </div>
                      <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{t('supplierTotalAmount')}</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_amount)}</p>
                      </div>
                      <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{t('productsCount')}</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.total_products}</p>
                      </div>
                      <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Package className="h-5 w-5 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>

          {/* Recent Purchase Receipts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium text-gray-900">Recent Purchase Receipts</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewAllReceipts}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                View All
              </Button>
            </div>

            {receiptsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : receipts.length > 0 ? (
              <div className="space-y-3">
                {receipts.map((receipt) => (
                  <Card key={receipt.receipt_id} className="bg-white shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium text-gray-900">#{receipt.receipt_id}</p>
                            <p className="text-sm text-gray-600">{formatDate(receipt.created_at)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">{receipt.item_count} items</p>
                            <p className="font-medium text-gray-900">{formatCurrency(receipt.total_amount)}</p>
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`${getReceiptStatusColor(receipt.status)}`}
                        >
                          {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-gray-50">
                <CardContent className="p-8 text-center">
                  <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">{t('noPurchaseReceiptsFound')}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
