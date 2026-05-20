'use client'

import { useState, useEffect } from 'react'
import { X, Truck, User, Star, MapPin, Phone, Mail, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Order, Shipper } from '@/lib/types'
import { hasOrderAction } from '@/lib/admin-auth'
import { shippersApi } from '@/lib/api'
import { useLanguage } from '@/contexts/LanguageContext'

interface AssignShipperModalProps {
  isOpen: boolean
  onClose: () => void
  order: Order | null
  onShipperAssigned?: () => void
}

export default function AssignShipperModal({ isOpen, onClose, order, onShipperAssigned }: AssignShipperModalProps) {
  const { t } = useLanguage()
  const [shippers, setShippers] = useState<Shipper[]>([])
  const [selectedShipper, setSelectedShipper] = useState<Shipper | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchingShippers, setFetchingShippers] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (!hasOrderAction('orders.assign_shipper')) {
        toast.error(t('noMenuAccess'))
        onClose()
        return
      }
      fetchAvailableShippers()
    }
  }, [isOpen, onClose, t])

  const translateAssignShipperError = (message?: string) => {
    if (!message) return t('failedToAssignShipper')

    if (message.includes('Cannot reassign shipper. Order is already being delivered')) {
      return t('cannotReassignShipperShipping')
    }

    if (message.includes('Cannot assign shipper. Order status must be')) {
      const statusMatch = message.match(/Current status:\s*([a-z_]+)/i)
      const status = statusMatch?.[1] || 'unknown'
      return t('cannotAssignShipperInvalidStatus').replace('{status}', status)
    }

    if (message.includes('Order not found')) {
      return t('orderNotFound')
    }

    if (message.includes('Shipper not found')) {
      return t('shipperNotFound')
    }

    if (message.includes('Shipper is not available or inactive')) {
      return t('shipperNotAvailable')
    }

    return message
  }

  const fetchAvailableShippers = async () => {
    try {
      setFetchingShippers(true)
      
      console.log('Fetching available shippers...')
      
      const data = await shippersApi.getAvailable()
      console.log('Response data:', data)
      
      if (data.success) {
        setShippers(data.data)
        console.log('Shippers set:', data.data.length, 'shippers')
      } else {
        console.error('API returned error:', data)
        toast.error('Failed to fetch available shippers')
      }
    } catch (error) {
      console.error('Error fetching shippers:', error)
      toast.error('Error fetching available shippers')
    } finally {
      setFetchingShippers(false)
    }
  }

  const handleAssignShipper = async () => {
    if (!selectedShipper || !order) return

    if (!hasOrderAction('orders.assign_shipper')) {
      toast.error(t('noMenuAccess'))
      return
    }

    try {
      setLoading(true)

      const data = await shippersApi.assign(
        order.order_id.toString(),
        String(selectedShipper.user_id),
      )

      if (data.success) {
        // Check if it's a reassignment or already assigned
        const message = data.message || 'Shipper assigned successfully'
        if (message.includes('reassigned')) {
          toast.success(t('shipperReassignedSuccessfully'))
        } else if (message.includes('already assigned')) {
          toast.success(t('shipperAlreadyAssigned'))
        } else {
          toast.success(t('shipperAssignedSuccessfully'))
        }
        onShipperAssigned?.()
        onClose()
        setSelectedShipper(null)
      } else {
        toast.error(translateAssignShipperError(data.message))
      }
    } catch (error) {
      console.error('Error assigning shipper:', error)
      toast.error(t('errorAssigningShipper'))
    } finally {
      setLoading(false)
    }
  }

  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')
  }

  const formatShippingAddress = (snapshot: unknown) => {
    if (!snapshot) return '—'

    let parsed: any = snapshot
    if (typeof snapshot === 'string') {
      try {
        parsed = JSON.parse(snapshot)
      } catch {
        return snapshot
      }
    }

    if (!parsed || typeof parsed !== 'object') return '—'

    const parts = [
      parsed.address_line ?? parsed.street,
      parsed.ward,
      parsed.district,
      parsed.province ?? parsed.city,
    ].filter(Boolean)

    return parts.length ? parts.join(', ') : '—'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-sans tracking-tight">
                {t('assignShipper')}
              </h3>
              <p className="text-sm text-slate-600">{t('selectShipperForOrder')} #{order?.invoice_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-6">
            {/* Order Information */}
            <Card className="bg-gradient-to-r from-slate-50 to-blue-50 border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Package className="h-4 w-4 text-white" />
                  </div>
                  {t('orderInformation')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('orderDetails')}</p>
                      <p className="font-semibold text-slate-900">{order?.invoice_number}</p>
                      <p className="text-sm text-slate-600">{t('customer')}: {order?.first_name} {order?.last_name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('shippingAddress')}</p>
                      <p className="text-sm text-slate-700">{formatShippingAddress(order?.shipping_address_snapshot)}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('orderValue')}</p>
                      <p className="font-bold text-lg text-emerald-600">
                        {new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND'
                        }).format(order?.total_amount || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('items')}</p>
                      <p className="font-semibold text-slate-900">{order?.item_count || 0} {t('items')}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Available Shippers */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <div className="h-8 w-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <Truck className="h-4 w-4 text-white" />
                  </div>
                  {t('availableShippers')} ({shippers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {fetchingShippers ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : shippers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="h-24 w-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Truck className="h-12 w-12 text-slate-400" />
                    </div>
                    <p className="text-slate-500">{t('noAvailableShippers')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {shippers.map((shipper) => (
                      <button
                        key={shipper.user_id}
                        onClick={() => setSelectedShipper(shipper)}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                          selectedShipper?.user_id === shipper.user_id
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                            <User className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1 space-y-3">
                            <div>
                              <h4 className="font-semibold text-slate-900 text-lg">
                                {shipper.first_name} {shipper.last_name}
                              </h4>
                              {shipper.email && <p className="text-sm text-slate-600">{shipper.email}</p>}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-slate-400" />
                                <span className="text-slate-700">{formatPhone(shipper.phone)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 text-amber-500" />
                                <span className="text-slate-700">{shipper.rating}/5</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <Badge 
                                variant="outline" 
                                className="bg-green-100 text-green-800 border-green-200"
                              >
                                {shipper.on_time_delivery_pct}% {t('onTime')}
                              </Badge>
                              <Badge 
                                variant="outline" 
                                className="bg-blue-50 text-blue-700 border-blue-200"
                              >
                                {shipper.total_delivered || 0} {t('deliveries')}
                              </Badge>
                            </div>
                            
                            {shipper.current_location && (
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <MapPin className="h-3 w-3" />
                                <span>{shipper.current_location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Selected Shipper Details */}
            {selectedShipper && (
              <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <div className="h-8 w-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    {t('selectedShipper')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 p-4 bg-white/50 rounded-xl border border-emerald-200">
                    <div className="h-16 w-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                      <User className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 text-lg">
                        {selectedShipper.first_name} {selectedShipper.last_name}
                      </h4>
                      {selectedShipper.email && <p className="text-slate-600">{selectedShipper.email}</p>}
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-slate-600">{formatPhone(selectedShipper.phone)}</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-amber-500" />
                          <span className="text-sm font-medium">{selectedShipper.rating}/5</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant="outline" 
                        className="bg-green-100 text-green-800 border-green-200"
                      >
                        {selectedShipper.on_time_delivery_pct}% {t('onTime')}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white"
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleAssignShipper}
            disabled={!selectedShipper || loading}
            className="shadow-lg"
          >
            {loading ? t('assigning') : t('assignShipper')}
          </Button>
        </div>
      </div>
    </div>
  )
}
