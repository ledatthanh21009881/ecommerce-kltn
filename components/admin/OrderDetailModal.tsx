'use client'

import { useState, useEffect } from 'react'
import { X, Package, Truck, CheckCircle, Clock, XCircle, MapPin, Phone, Mail, FileText, Calendar, DollarSign, User, ShoppingBag, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Order, OrderItem, OrderStatusLog, ShippingTracking, Payment } from '@/lib/types'
import { ordersApi } from '@/lib/api'
import { useLanguage } from '@/contexts/LanguageContext'

interface OrderDetailModalProps {
  isOpen: boolean
  onClose: () => void
  order: Order | null
  onStatusUpdate?: () => void
  onShowPaymentQr?: (order: Order) => void
}

export default function OrderDetailModal({ isOpen, onClose, order, onStatusUpdate, onShowPaymentQr }: OrderDetailModalProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [orderDetails, setOrderDetails] = useState<Order | null>(null)

  useEffect(() => {
    if (isOpen && order) {
      fetchOrderDetails(order.order_id)
    }
  }, [isOpen, order])

  const fetchOrderDetails = async (orderId: number) => {
    try {
      setLoading(true)
      console.log('Fetching order details for ID:', orderId)
      
      const data = await ordersApi.getById(orderId.toString())
      console.log('Order Details Data:', data.data)
      setOrderDetails(data.data)
    } catch (error) {
      console.error('Error fetching order details:', error)
      toast.error('Error fetching order details')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'processing':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'shipping':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'returned':
        return 'bg-orange-50 text-orange-700 border-orange-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'processing':
        return <Package className="h-4 w-4" />
      case 'shipping':
        return <Truck className="h-4 w-4" />
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      case 'returned':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const formatPrice = (price: number | string | undefined) => {
    if (!price) return '₫0'
    const numPrice = typeof price === 'string' ? parseFloat(price) || 0 : price
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(numPrice)
  }

  const formatPriceFromNumber = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price)
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

  const parseShippingAddress = (addressSnapshot: string) => {
    try {
      const address = JSON.parse(addressSnapshot)
      return `${address.address_line}, ${address.ward}, ${address.district}, ${address.province}`
    } catch {
      return addressSnapshot
    }
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
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 font-sans tracking-tight">
                {t('orderNumber')}{order?.invoice_number || order?.order_id}
              </h3>
              <p className="text-sm text-slate-600">{t('completeOrderDetails')}</p>
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : orderDetails ? (
            <div className="space-y-6">
              {/* Order Status */}
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
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('invoiceNumber')}</p>
                        <p className="font-bold text-lg text-slate-900 font-sans tracking-tight">{orderDetails.invoice_number}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('orderId')}</p>
                        <p className="font-semibold text-slate-900">#{orderDetails.order_id}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('status')}</p>
                        <Badge 
                          variant="outline" 
                          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium w-fit ${getStatusColor(orderDetails.status)}`}
                        >
                          {getStatusIcon(orderDetails.status)}
                          {t(orderDetails.status)}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('created')}</p>
                        <p className="text-sm text-slate-700">{formatDate(orderDetails.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Information */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <div className="h-8 w-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    {t('customerInformation')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('fullName')}</p>
                        <p className="font-semibold text-slate-900">{orderDetails.first_name} {orderDetails.last_name}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('email')}</p>
                        <p className="font-semibold text-slate-900">{orderDetails.email}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('phone')}</p>
                        <p className="font-semibold text-slate-900">{orderDetails.phone}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('shippingAddress')}</p>
                        <p className="text-sm text-slate-700">{parseShippingAddress(orderDetails.shipping_address_snapshot)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card className="bg-white border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <ShoppingBag className="h-4 w-4 text-white" />
                    </div>
                    {t('orderItems')} ({orderDetails.items?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orderDetails.items?.map((item: OrderItem) => (
                      <div key={item.item_id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
                        <div className="flex items-center gap-4">
                          <div className="h-16 w-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center">
                            {item.product_image ? (
                              <img src={item.product_image} alt={item.product_name_snapshot} className="h-12 w-12 object-cover rounded" />
                            ) : (
                              <Package className="h-8 w-8 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{item.product_name_snapshot}</p>
                            <p className="text-sm text-slate-600">
                              SKU: {item.sku || 'N/A'} | Size: {item.size_name || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-slate-900">{item.quantity} x {formatPrice(item.unit_price)}</p>
                          <p className="font-bold text-lg text-emerald-600">{formatPriceFromNumber(item.quantity * item.unit_price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Order Summary */}
              <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <div className="h-8 w-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-white" />
                    </div>
                    {t('orderSummary')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t('subtotal')}:</span>
                      <span className="font-semibold">{formatPrice(orderDetails.total_amount)}</span>
                    </div>
                    {(orderDetails.discount_amount_applied && parseFloat(String(orderDetails.discount_amount_applied)) > 0) && (
                      <div className="flex justify-between text-emerald-600">
                        <span>{t('discount')}:</span>
                        <span>-{formatPrice(orderDetails.discount_amount_applied)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t('shippingCost')}:</span>
                      <span className="font-semibold">{formatPrice(orderDetails.shipping_fee)}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-3">
                      <div className="flex justify-between font-bold text-xl">
                        <span className="text-slate-900">{t('totalAmount')}:</span>
                        <span className="text-emerald-600">{formatPrice(orderDetails.total_amount)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Information */}
              {orderDetails.tracking && (
                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-slate-900">
                      <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <Truck className="h-4 w-4 text-white" />
                      </div>
                      {t('shippingInformation')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('shipper')}</p>
                          <p className="font-semibold text-slate-900">{orderDetails.tracking.first_name} {orderDetails.tracking.last_name}</p>
                          <p className="text-sm text-slate-600">{orderDetails.tracking.phone}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('rating')}</p>
                          <p className="font-semibold text-slate-900">{orderDetails.tracking.rating || 'N/A'}/5</p>
                          <p className="text-sm text-slate-600">{t('phone')}: {orderDetails.tracking.phone || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment Information */}
              {orderDetails.payment && (
                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-slate-900">
                      <div className="h-8 w-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-white" />
                      </div>
                      {t('paymentInformation')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('method')}</p>
                          <p className="font-semibold text-slate-900 capitalize">{t(orderDetails.payment.method as any) || orderDetails.payment.method}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('status')}</p>
                          <Badge 
                            variant="outline" 
                            className={orderDetails.payment.status === 'confirmed' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}
                          >
                            {t(orderDetails.payment.status as any) || orderDetails.payment.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {orderDetails.payment.transaction_id && (
                          <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('transactionId')}</p>
                            <p className="font-semibold text-slate-900">{orderDetails.payment.transaction_id}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t('amountPaid')}</p>
                          <p className="font-bold text-lg text-emerald-600">{formatPrice(orderDetails.payment.paid_amount)}</p>
                        </div>
                      </div>
                    </div>
                    {onShowPaymentQr &&
                      order &&
                      ['payos', 'bank_transfer'].includes(
                        String(orderDetails.payment.method || '').toLowerCase()
                      ) &&
                      String(orderDetails.payment.status || '').toLowerCase() !== 'confirmed' && (
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-4 w-full sm:w-auto"
                          onClick={() => onShowPaymentQr(order)}
                        >
                          <QrCode className="mr-2 h-4 w-4" />
                          {t('showPaymentQr')}
                        </Button>
                      )}
                  </CardContent>
                </Card>
              )}

              {/* Status History */}
              {orderDetails.status_logs && orderDetails.status_logs.length > 0 && (
                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-slate-900">
                      <div className="h-8 w-8 bg-gradient-to-br from-slate-500 to-slate-600 rounded-lg flex items-center justify-center">
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                      {t('statusHistory')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {orderDetails.status_logs.map((log: OrderStatusLog) => (
                        <div key={log.log_id} className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getStatusColor(log.status)}`}>
                            {getStatusIcon(log.status)}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">{t(log.status as any) || log.status}</p>
                            {log.reason && <p className="text-sm text-slate-600">{log.reason}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-600">{formatDate(log.changed_at)}</p>
                            <p className="text-xs text-slate-500">{t('by')} {log.first_name} {log.last_name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {(orderDetails.note || orderDetails.internal_note) && (
                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-slate-900">
                      <div className="h-8 w-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      {t('notes')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {orderDetails.note && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{t('customerNote')}</p>
                          <p className="text-sm bg-slate-50 p-4 rounded-lg border border-slate-200">{orderDetails.note}</p>
                        </div>
                      )}
                      {orderDetails.internal_note && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{t('internalNote')}</p>
                          <p className="text-sm bg-blue-50 p-4 rounded-lg border border-blue-200">{orderDetails.internal_note}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="h-24 w-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-12 w-12 text-slate-400" />
              </div>
              <p className="text-slate-500">{t('noOrderDetailsAvailable')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
