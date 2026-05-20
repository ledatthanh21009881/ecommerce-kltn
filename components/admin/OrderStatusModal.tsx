'use client'

import { useState } from 'react'
import { X, Package, Truck, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Order } from '@/lib/types'
import { hasOrderAction } from '@/lib/admin-auth'
import { ordersApi } from '@/lib/api'
import { useLanguage } from '@/contexts/LanguageContext'
import type { TranslationKey } from '@/lib/ui-translations'

interface OrderStatusModalProps {
  isOpen: boolean
  onClose: () => void
  order: Order | null
  onStatusUpdate?: () => void
}

const getStatusOptions = (t: (key: TranslationKey) => string) => [
  { value: 'pending', label: t('pending'), icon: Clock, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'processing', label: t('processing'), icon: Package, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'shipping', label: t('shipping'), icon: Truck, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'completed', label: t('completed'), icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'cancelled', label: t('cancelled'), icon: XCircle, color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'returned', label: t('returned'), icon: XCircle, color: 'bg-orange-50 text-orange-700 border-orange-200' }
]

export default function OrderStatusModal({ isOpen, onClose, order, onStatusUpdate }: OrderStatusModalProps) {
  const { t } = useLanguage()
  const [selectedStatus, setSelectedStatus] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!selectedStatus || !order) return

    if (!hasOrderAction('orders.manage')) {
      toast.error(t('noMenuAccess'))
      return
    }

    try {
      setLoading(true)

      const data = await ordersApi.updateStatus(
        order.order_id.toString(),
        selectedStatus,
        reason || undefined,
      )

      if (data.success) {
        toast.success('Order status updated successfully')
        onStatusUpdate?.()
        onClose()
        setSelectedStatus('')
        setReason('')
      } else {
        toast.error(data.message || 'Failed to update order status')
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error))
      console.error('Error updating order status:', err)

      let errorMessage = 'Có lỗi xảy ra khi cập nhật trạng thái đơn hàng'
      if (err.message.includes('non-JSON response')) {
        errorMessage = 'Lỗi kết nối server. Vui lòng thử lại sau.'
      } else if (err.message.includes('Failed to fetch') || err.message.includes('API Error: 403')) {
        errorMessage = t('noMenuAccess')
      } else {
        errorMessage = err.message
      }
      
      toast.error(errorMessage)
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

  if (!isOpen) return null

  const currentStatus = order?.status ?? ''
  const statusLabel = currentStatus
    ? t(currentStatus as TranslationKey) ||
      `${currentStatus.charAt(0).toUpperCase()}${currentStatus.slice(1)}`
    : ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 border border-slate-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-sans tracking-tight">
                {t('updateOrderStatus')}
              </h3>
              <p className="text-xs text-slate-600">{t('orderNumber')}{order?.invoice_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Current Status */}
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-6 w-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md flex items-center justify-center">
                <Package className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-semibold text-slate-900">{t('currentStatus')}</span>
            </div>
            <Badge 
              variant="outline" 
              className={`flex items-center gap-2 px-3 py-1 text-xs font-medium w-fit ${getStatusColor(currentStatus)}`}
            >
              {getStatusIcon(currentStatus)}
              {statusLabel}
            </Badge>
          </div>

          {/* Status Flow Guide */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-6 w-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-md flex items-center justify-center">
                <AlertCircle className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-semibold text-slate-900">{t('statusFlowGuide')}</span>
            </div>
            <div className="text-xs text-slate-700 space-y-1">
              <p><strong>{t('normal')}:</strong> {t('pending')} → {t('processing')} → {t('shipping')} → {t('completed')}</p>
              <p><strong>{t('cancel')}:</strong> {t('anyStatus')} → {t('cancelled')}</p>
              <p><strong>{t('return')}:</strong> {t('completed')} → {t('returned')}</p>
            </div>
          </div>

          {/* New Status Selection */}
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-md flex items-center justify-center">
                <Package className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-semibold text-slate-900">{t('selectNewStatus')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {getStatusOptions(t).map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    onClick={() => setSelectedStatus(option.value)}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                      selectedStatus === option.value
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`h-8 w-8 rounded-md flex items-center justify-center ${option.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{option.label}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Reason Input */}
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-6 w-6 bg-gradient-to-br from-amber-500 to-orange-600 rounded-md flex items-center justify-center">
                <AlertCircle className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-semibold text-slate-900">{t('reasonOptional')}</span>
            </div>
            <Textarea
              placeholder={t('enterReasonForStatusChange')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px] bg-white/50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all duration-200 text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <Button
            variant="outline"
            onClick={onClose}
            size="sm"
            className="bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white"
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedStatus || loading}
            size="sm"
            className="shadow-lg"
          >
            {loading ? t('updating') : t('updateStatus')}
          </Button>
        </div>
      </div>
    </div>
  )
}
