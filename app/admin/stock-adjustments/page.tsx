'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, RefreshCw, Trash2, CheckCircle2, Package, MinusCircle, Ban, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import ConfirmModal from '@/components/ui/confirm-modal'
import { toast } from 'sonner'
import { getAuthData, checkAndRefreshAuth } from '@/lib/admin-auth'
import { useLanguage } from '@/contexts/LanguageContext'

interface StockAdjustment {
  adjustment_id: number
  reason: string
  status: 'draft' | 'confirmed' | 'cancelled'
  note?: string
  item_count: number
  product_names?: string
  size_names?: string
  total_change: number
  created_at: string
  confirmed_at?: string
}

interface ProductVariant {
  variant_id: number
  product_id: number
  size_id: number
  product_name: string
  size_name: string
  display_name: string
  stock_quantity: number
}

interface AdjustmentItemInput {
  /** Stable key for UI (search state, React list) — not sent to API */
  _rowId: number
  product_id: number
  size_id: number
  variant_id: number
  quantity_change: number
  note: string
}

export default function AdminStockAdjustmentsPage() {
  return <StockAdjustmentsPanel />
}

export function StockAdjustmentsPanel({ embedded = false }: { embedded?: boolean }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [sizeFilter, setSizeFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [confirmingAdjustment, setConfirmingAdjustment] = useState<StockAdjustment | null>(null)
  const [cancellingAdjustment, setCancellingAdjustment] = useState<StockAdjustment | null>(null)
  const [deletingAdjustment, setDeletingAdjustment] = useState<StockAdjustment | null>(null)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const nextRowIdRef = useRef(1)
  const [items, setItems] = useState<AdjustmentItemInput[]>([
    { _rowId: 0, product_id: 0, size_id: 0, variant_id: 0, quantity_change: 0, note: '' }
  ])
  /** Per line product search (keyed by `_rowId`) inside product Select */
  const [lineProductQuery, setLineProductQuery] = useState<Record<number, string>>({})

  const fetchAdjustments = async () => {
    try {
      setLoading(true)
      const ok = await checkAndRefreshAuth()
      if (!ok) {
        if (typeof window !== 'undefined') window.location.href = '/admin-login'
        return
      }
      const { token } = getAuthData()
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      const response = await fetch(`/api/backend/v1/stock-adjustments?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (!data.success) {
        toast.error(data.message || t('failedToFetchStockAdjustments'))
        return
      }
      setAdjustments(data.data?.items || data.data || [])
    } catch {
      toast.error(t('failedToFetchStockAdjustments'))
    } finally {
      setLoading(false)
    }
  }

  const fetchVariants = async () => {
    try {
      const ok = await checkAndRefreshAuth()
      if (!ok) return
      const { token } = getAuthData()
      const response = await fetch('/api/backend/v1/products/variants', {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (!data.success) return
      const variantList = Array.isArray(data.data?.items) ? data.data.items : (Array.isArray(data.data) ? data.data : [])
      setVariants(variantList)
    } catch {
      // Silent for supporting data fetch
    }
  }

  useEffect(() => {
    fetchAdjustments()
  }, [statusFilter])

  useEffect(() => {
    fetchVariants()
  }, [])

  useEffect(() => {
    if (!embedded) return

    const handleOpenCreate = () => setIsCreateOpen(true)
    const handleRefresh = () => fetchAdjustments()
    window.addEventListener('open-stock-adjustment-create', handleOpenCreate)
    window.addEventListener('refresh-stock-adjustments', handleRefresh)
    return () => {
      window.removeEventListener('open-stock-adjustment-create', handleOpenCreate)
      window.removeEventListener('refresh-stock-adjustments', handleRefresh)
    }
  }, [embedded])

  useEffect(() => {
    if (isCreateOpen) setLineProductQuery({})
  }, [isCreateOpen])

  const uniqueSizes = useMemo(() => {
    return Array.from(new Set(variants.map((variant) => variant.size_name).filter(Boolean)))
  }, [variants])

  const filteredAdjustments = useMemo(() => {
    const lower = searchTerm.toLowerCase().trim()
    return adjustments.filter((adj) => {
      const matchesSearch = !lower || String(adj.adjustment_id).includes(lower) || adj.reason.toLowerCase().includes(lower)
      const sizes = (adj.size_names || '').split(',').map((s) => s.trim()).filter(Boolean)
      const matchesSize = sizeFilter === 'all' || sizes.includes(sizeFilter)
      return matchesSearch && matchesSize
    })
  }, [adjustments, searchTerm, sizeFilter])

  const resetCreateForm = () => {
    setReason('')
    setNote('')
    nextRowIdRef.current = 1
    setLineProductQuery({})
    setItems([{ _rowId: 0, product_id: 0, size_id: 0, variant_id: 0, quantity_change: 0, note: '' }])
  }

  const addItem = () => {
    const id = nextRowIdRef.current++
    setItems((prev) => [...prev, { _rowId: id, product_id: 0, size_id: 0, variant_id: 0, quantity_change: 0, note: '' }])
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    const rowId = items[index]?._rowId
    if (rowId !== undefined) {
      setLineProductQuery((prev) => {
        const { [rowId]: _, ...rest } = prev
        return rest
      })
    }
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, patch: Partial<AdjustmentItemInput>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const productOptions = useMemo(() => {
    const map = new Map<number, string>()
    variants.forEach((variant) => {
      if (!map.has(variant.product_id)) map.set(variant.product_id, variant.product_name)
    })
    return Array.from(map.entries()).map(([product_id, product_name]) => ({ product_id, product_name }))
  }, [variants])

  const getSizesByProductId = (productId: number) => {
    const seen = new Set<number>()
    return variants
      .filter((variant) => variant.product_id === productId)
      .filter((variant) => {
        if (seen.has(variant.size_id)) return false
        seen.add(variant.size_id)
        return true
      })
      .map((variant) => ({ size_id: variant.size_id, size_name: variant.size_name }))
  }

  const handleCreate = async () => {
    if (!reason.trim()) {
      toast.error(t('stockAdjustmentReasonRequired'))
      return
    }
    const validItems = items
      .filter((item) => item.variant_id > 0 && item.quantity_change > 0)
      .map((item) => ({
        product_id: item.product_id,
        size_id: item.size_id,
        variant_id: item.variant_id,
        note: item.note,
        quantity_change: -Math.abs(item.quantity_change)
      }))
    if (validItems.length === 0) {
      toast.error(t('stockAdjustmentNeedAtLeastOneItem'))
      return
    }
    const variantIds = validItems.map((item) => item.variant_id)
    if (new Set(variantIds).size !== variantIds.length) {
      toast.error(t('stockAdjustmentDuplicateVariant'))
      return
    }

    try {
      setSubmitting(true)
      const ok = await checkAndRefreshAuth()
      if (!ok) {
        if (typeof window !== 'undefined') window.location.href = '/admin-login'
        return
      }
      const { token } = getAuthData()
      const response = await fetch('/api/backend/v1/stock-adjustments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason.trim(),
          note: note.trim() || null,
          items: validItems
        })
      })
      const data = await response.json()
      if (!data.success) {
        toast.error(data.message || t('failedToCreateStockAdjustment'))
        return
      }
      toast.success(t('stockAdjustmentCreatedSuccessfully'))
      setIsCreateOpen(false)
      resetCreateForm()
      fetchAdjustments()
    } catch {
      toast.error(t('failedToCreateStockAdjustment'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmAdjustment = async () => {
    if (!confirmingAdjustment) return
    try {
      const ok = await checkAndRefreshAuth()
      if (!ok) {
        if (typeof window !== 'undefined') window.location.href = '/admin-login'
        return
      }
      const { token } = getAuthData()
      const response = await fetch(`/api/backend/v1/stock-adjustments/confirm?id=${confirmingAdjustment.adjustment_id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (!data.success) {
        toast.error(data.message || t('failedToConfirmStockAdjustment'))
        return
      }
      toast.success(t('stockAdjustmentConfirmedSuccessfully'))
      setConfirmingAdjustment(null)
      fetchAdjustments()
    } catch {
      toast.error(t('failedToConfirmStockAdjustment'))
    }
  }

  const handleDeleteAdjustment = async () => {
    if (!deletingAdjustment) return
    try {
      const ok = await checkAndRefreshAuth()
      if (!ok) {
        if (typeof window !== 'undefined') window.location.href = '/admin-login'
        return
      }
      const { token } = getAuthData()
      const response = await fetch(`/api/backend/v1/stock-adjustments?id=${deletingAdjustment.adjustment_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (!data.success) {
        toast.error(data.message || t('failedToDeleteStockAdjustment'))
        return
      }
      toast.success(t('stockAdjustmentDeletedSuccessfully'))
      setDeletingAdjustment(null)
      fetchAdjustments()
    } catch {
      toast.error(t('failedToDeleteStockAdjustment'))
    }
  }

  const handleCancelAdjustment = async () => {
    if (!cancellingAdjustment) return
    try {
      const ok = await checkAndRefreshAuth()
      if (!ok) {
        if (typeof window !== 'undefined') window.location.href = '/admin-login'
        return
      }
      const { token } = getAuthData()
      const response = await fetch(`/api/backend/v1/stock-adjustments/cancel?id=${cancellingAdjustment.adjustment_id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (!data.success) {
        toast.error(data.message || t('failedToCancelStockAdjustment'))
        return
      }
      toast.success(t('stockAdjustmentCancelledSuccessfully'))
      setCancellingAdjustment(null)
      fetchAdjustments()
    } catch {
      toast.error(t('failedToCancelStockAdjustment'))
    }
  }

  const getStatusClass = (status: StockAdjustment['status']) => {
    if (status === 'confirmed') return 'bg-green-100 text-green-800 border-green-200'
    if (status === 'cancelled') return 'bg-red-100 text-red-800 border-red-200'
    return 'bg-yellow-100 text-yellow-800 border-yellow-200'
  }

  const getStatusLabel = (status: StockAdjustment['status']) => {
    if (status === 'confirmed') return t('confirmed')
    if (status === 'cancelled') return t('cancelled')
    return t('draft')
  }

  return (
    <div className={embedded ? "space-y-6" : "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6"}>
      <div className={embedded ? "space-y-6" : "max-w-7xl mx-auto space-y-6"}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {!embedded && (
            <div>
              <h1 className="admin-page-title mb-2">{t('stockAdjustmentManagement')}</h1>
              <p className="admin-page-description">{t('stockAdjustmentManagementDesc')}</p>
            </div>
          )}
          {!embedded && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={fetchAdjustments} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {t('refresh')}
              </Button>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('createStockAdjustment')}
              </Button>
            </div>
          )}
        </div>

        <Card className="bg-white/80 border-0 shadow-lg">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label>{t('search')}</Label>
              <Input
                placeholder={t('searchStockAdjustmentsPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('statusFilter')}</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('allStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatus')}</SelectItem>
                  <SelectItem value="draft">{t('draft')}</SelectItem>
                  <SelectItem value="confirmed">{t('confirmed')}</SelectItem>
                  <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('size')}</Label>
              <Select value={sizeFilter} onValueChange={setSizeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('allSizes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allSizes')}</SelectItem>
                  {uniqueSizes.map((sizeName) => (
                    <SelectItem key={sizeName} value={sizeName}>
                      {sizeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 border-0 shadow-lg">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">{t('adjustmentIdHeader')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">{t('reasonLabel')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">{t('productLabel')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">{t('size')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">{t('stockChangeHeader')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">{t('status')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-500" colSpan={7}>{t('loading')}</td>
                  </tr>
                ) : filteredAdjustments.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-500" colSpan={7}>{t('noStockAdjustmentsFound')}</td>
                  </tr>
                ) : filteredAdjustments.map((adj) => (
                  <tr key={adj.adjustment_id}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">#{adj.adjustment_id}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{adj.reason}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{adj.product_names || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{adj.size_names || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <span className={adj.total_change >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {adj.total_change >= 0 ? '+' : ''}{adj.total_change}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant="outline" className={getStatusClass(adj.status)}>{getStatusLabel(adj.status)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {adj.status === 'draft' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => setConfirmingAdjustment(adj)} className="text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setCancellingAdjustment(adj)} className="text-amber-600">
                              <Ban className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeletingAdjustment(adj)} className="text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('createStockAdjustment')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('reasonLabel')} *</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('stockAdjustmentReasonPlaceholder')} />
            </div>
            <div className="space-y-2">
              <Label>{t('noteLabel')}</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('stockAdjustmentNotePlaceholder')} rows={3} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t('receiptItemsLabel')} *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  {t('addItem')}
                </Button>
              </div>

              {items.map((item, index) => {
                const q = (lineProductQuery[item._rowId] ?? '').toLowerCase().trim()
                let lineProducts = !q
                  ? productOptions
                  : productOptions.filter((p) => p.product_name.toLowerCase().includes(q))
                if (item.product_id > 0) {
                  const sel = productOptions.find((p) => p.product_id === item.product_id)
                  if (sel && !lineProducts.some((p) => p.product_id === item.product_id)) {
                    lineProducts = [sel, ...lineProducts]
                  }
                }
                return (
                <Card key={item._rowId} className="border border-slate-200">
                  <CardContent className="p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                    <div className="md:col-span-4 space-y-1">
                      <Label>{t('productLabel')} *</Label>
                      <Select
                        value={item.product_id > 0 ? String(item.product_id) : ''}
                        onValueChange={(value) => {
                          const productId = parseInt(value, 10) || 0
                          updateItem(index, { product_id: productId, size_id: 0, variant_id: 0 })
                        }}
                      >
                        <SelectTrigger className="border-slate-200 bg-white text-left">
                          <SelectValue placeholder={t('selectProduct')} />
                        </SelectTrigger>
                        <SelectContent className="z-[200] p-0" position="popper" sideOffset={4}>
                          <div
                            className="sticky top-0 z-10 border-b border-border bg-popover p-2"
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <div className="relative" onPointerDown={(e) => e.stopPropagation()}>
                              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                              <Input
                                className="h-9 pl-8"
                                placeholder={t('searchProducts')}
                                value={lineProductQuery[item._rowId] ?? ''}
                                onChange={(e) =>
                                  setLineProductQuery((prev) => ({
                                    ...prev,
                                    [item._rowId]: e.target.value
                                  }))
                                }
                                onPointerDown={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                onKeyUp={(e) => e.stopPropagation()}
                                autoComplete="off"
                              />
                            </div>
                          </div>
                          <div className="max-h-[min(50vh,14rem)] overflow-y-auto p-1">
                            {lineProducts.length === 0 ? (
                              <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                                {t('noProductsFound')}
                              </div>
                            ) : (
                              lineProducts.map((product) => (
                                <SelectItem key={product.product_id} value={String(product.product_id)}>
                                  {product.product_name}
                                </SelectItem>
                              ))
                            )}
                          </div>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <Label>{t('size')} *</Label>
                      <Select
                        value={item.size_id > 0 ? String(item.size_id) : ''}
                        onValueChange={(value) => {
                          const sizeId = parseInt(value, 10) || 0
                          const matched = variants.find((variant) => variant.product_id === item.product_id && variant.size_id === sizeId)
                          updateItem(index, {
                            size_id: sizeId,
                            variant_id: matched?.variant_id ?? 0
                          })
                        }}
                        disabled={item.product_id <= 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={item.product_id > 0 ? t('selectSize') : t('selectProductFirst')} />
                        </SelectTrigger>
                        <SelectContent>
                          {getSizesByProductId(item.product_id).map((sizeOption) => (
                            <SelectItem key={sizeOption.size_id} value={String(sizeOption.size_id)}>
                              {sizeOption.size_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label>{t('stockDecreaseQuantityLabel')} *</Label>
                      <Input
                        type="number"
                        min="0"
                        value={item.quantity_change}
                        onChange={(e) => updateItem(index, { quantity_change: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-1 text-xs text-slate-500">
                      {item.quantity_change > 0 ? (
                        <><MinusCircle className="h-3.5 w-3.5 text-red-600" />-{item.quantity_change}</>
                      ) : (
                        <><Package className="h-3.5 w-3.5" />{t('stockNoChange')}</>
                      )}
                    </div>
                    <div className="md:col-span-1">
                      {items.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)} className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="md:col-span-12 space-y-1">
                      <Label>{t('noteLabel')}</Label>
                      <Input
                        value={item.note}
                        onChange={(e) => updateItem(index, { note: e.target.value })}
                        placeholder={t('stockAdjustmentItemNotePlaceholder')}
                      />
                    </div>
                  </CardContent>
                </Card>
                )
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? t('saving') : t('createStockAdjustment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        isOpen={confirmingAdjustment !== null}
        onClose={() => setConfirmingAdjustment(null)}
        onConfirm={handleConfirmAdjustment}
        title={t('confirmStockAdjustment')}
        description={t('confirmStockAdjustmentPrompt', { id: String(confirmingAdjustment?.adjustment_id ?? '') })}
        confirmText={t('confirm')}
        cancelText={t('cancel')}
        appearance="neutral"
      />

      <ConfirmModal
        isOpen={cancellingAdjustment !== null}
        onClose={() => setCancellingAdjustment(null)}
        onConfirm={handleCancelAdjustment}
        title={t('cancelStockAdjustment')}
        description={t('cancelStockAdjustmentConfirm', { id: String(cancellingAdjustment?.adjustment_id ?? '') })}
        confirmText={t('cancelAdjustmentAction')}
        cancelText={t('cancel')}
        appearance="neutral"
      />

      <ConfirmModal
        isOpen={deletingAdjustment !== null}
        onClose={() => setDeletingAdjustment(null)}
        onConfirm={handleDeleteAdjustment}
        title={t('deleteStockAdjustment')}
        description={t('deleteStockAdjustmentConfirm', { id: String(deletingAdjustment?.adjustment_id ?? '') })}
        confirmText={t('delete')}
      />
    </div>
  )
}

