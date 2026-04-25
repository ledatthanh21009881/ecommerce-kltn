'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle, Clock, XCircle, Building2, Calendar, Package, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { getAuthData } from '@/lib/admin-auth'
import { useLanguage } from '@/contexts/LanguageContext'

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

interface ReceiptItem {
  item_id: number
  variant_id: number
  quantity: number
  unit_price: number
  subtotal: number
  note?: string
  product_name: string
  size_name: string
  sku: string
}

interface PurchaseReceiptDetailModalProps {
  isOpen: boolean
  onClose: () => void
  receipt: PurchaseReceipt | null
  onConfirmed: () => void
}

export default function PurchaseReceiptDetailModal({ isOpen, onClose, receipt, onConfirmed }: PurchaseReceiptDetailModalProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [receiptDetails, setReceiptDetails] = useState<{
    receipt_id: number
    supplier_id: number
    supplier_name: string
    supplier_contact: string
    supplier_phone: string
    supplier_email: string
    supplier_address: string
    note?: string
    status: 'pending' | 'confirmed' | 'cancelled'
    created_at: string
    updated_at?: string
    items: ReceiptItem[]
    total_amount: number
    item_count: number
  } | null>(null)

  useEffect(() => {
    if (isOpen && receipt) {
      fetchReceiptDetails()
    }
  }, [isOpen, receipt])

  const fetchReceiptDetails = async () => {
    if (!receipt) return

    try {
      setLoading(true)
      const { token } = getAuthData()
      
      const response = await fetch(`/api/backend/v1/purchase-receipts?id=${receipt.receipt_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        setReceiptDetails(data.data)
      } else {
        toast.error(data.message || t('failedToFetchReceiptDetails'))
      }
    } catch (error) {
      console.error('Error fetching receipt details:', error)
      toast.error(t('failedToFetchReceiptDetails'))
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!receipt) return

    try {
      setConfirming(true)
      const { token } = getAuthData()
      
      const response = await fetch(`/api/backend/v1/purchase-receipts/confirm?id=${receipt.receipt_id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success(t('receiptConfirmedAndStockUpdated'))
        onConfirmed()
      } else {
        toast.error(data.message || 'Failed to confirm receipt')
      }
    } catch (error) {
      console.error('Error confirming receipt:', error)
      toast.error(t('failedToConfirmReceipt'))
    } finally {
      setConfirming(false)
    }
  }

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isOpen || !receipt) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {t('receiptDetailsTitle', { id: String(receipt.receipt_id) })}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : receiptDetails ? (
            <>
              {/* Receipt Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {t('receiptInformation')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">{t('receiptSupplierLabel')}</label>
                      <p className="text-lg font-semibold">{receiptDetails?.supplier_name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">{t('receiptStatusHeader')}</label>
                      <div className="mt-1">
                        <Badge className={`${getStatusColor(receiptDetails?.status || 'pending')} flex items-center gap-1 w-fit`}>
                          {getStatusIcon(receiptDetails?.status || 'pending')}
                          {receiptDetails?.status === 'pending'
                            ? t('pending')
                            : receiptDetails?.status === 'confirmed'
                              ? t('confirmed')
                              : t('cancelled')}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">{t('receiptCreatedHeader')}</label>
                      <p className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(receiptDetails?.created_at || '')}
                      </p>
                    </div>
                    {receiptDetails?.updated_at && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">{t('lastUpdatedLabel')}</label>
                        <p className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(receiptDetails.updated_at)}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {receiptDetails?.note && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">{t('noteLabel')}</label>
                      <p className="mt-1 p-3 bg-gray-50 rounded-lg">{receiptDetails.note}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Items Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {t('itemsBreakdown')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('product')}</TableHead>
                        <TableHead>{t('sku')}</TableHead>
                        <TableHead className="text-right">{t('quantity')}</TableHead>
                        <TableHead className="text-right">{t('unitPriceVnd')}</TableHead>
                        <TableHead className="text-right">{t('subtotalLabel')}</TableHead>
                        <TableHead>{t('noteLabel')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receiptDetails?.items?.map((item, index) => (
                        <TableRow key={item.item_id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.product_name}</p>
                              <p className="text-sm text-gray-600">{t('size')}: {item.size_name}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {item.unit_price.toLocaleString('vi-VN')} ₫
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {item.subtotal.toLocaleString('vi-VN')} ₫
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {item.note || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card className="bg-blue-50">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Package className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium text-gray-600">{t('totalItemsLabel')}</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        {receiptDetails?.items?.length || 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Wallet className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-gray-600">{t('receiptTotalAmountHeader')}</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {(receiptDetails?.total_amount || 0).toLocaleString('vi-VN')} ₫
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-purple-600" />
                        <span className="text-sm font-medium text-gray-600">{t('receiptStatusHeader')}</span>
                      </div>
                      <Badge className={`${getStatusColor(receiptDetails?.status || 'pending')} text-lg px-3 py-1`}>
                        {receiptDetails?.status === 'pending' ? t('pending') : receiptDetails?.status === 'confirmed' ? t('confirmed') : t('cancelled')}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">{t('failedToLoadReceiptDetails')}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-slate-800 text-slate-800 hover:bg-slate-100 transition-all duration-200"
            >
              {t('cancel')}
            </Button>
            {receiptDetails?.status === 'pending' && (
              <Button 
                onClick={handleConfirm} 
                disabled={confirming}
                className="bg-black text-white border border-black hover:bg-white hover:text-black transition-all duration-200"
              >
                {confirming ? t('confirming') : t('confirmReceipt')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
