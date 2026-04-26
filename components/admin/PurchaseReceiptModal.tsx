'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { X, Plus, Trash2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { getAuthData } from '@/lib/admin-auth'
import { useLanguage } from '@/contexts/LanguageContext'
import { violatesVndPriceStep } from '@/lib/vnd-price-step'

interface ProductVariant {
  variant_id: number
  product_id: number
  size_id: number
  sku: string
  stock_quantity: number
  status: string
  product_name: string
  size_name: string
  display_name: string
}

interface Supplier {
  supplier_id: number
  supplier_name: string
  contact_name: string
  phone: string
  email: string
  address: string
  status: string
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

interface PurchaseReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  receipt: PurchaseReceipt | null  // null = Add, có data = Edit
  onSaved: () => void
}

interface ReceiptItem {
  /** Stable id for search state + list keys */
  _key: number
  variant_id: number
  product_id: number
  size_id: number
  quantity: number
  unit_price: number
  note: string
}

export default function PurchaseReceiptModal({ isOpen, onClose, receipt, onSaved }: PurchaseReceiptModalProps) {
  const { t } = useLanguage()
  const nextItemKeyRef = useRef(1)
  const [loading, setLoading] = useState(false)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [lineProductQuery, setLineProductQuery] = useState<Record<number, string>>({})
  const [formData, setFormData] = useState({
    supplier_id: 0,
    note: '',
    items: [
      { _key: 0, variant_id: 0, product_id: 0, size_id: 0, quantity: 1, unit_price: 0, note: '' }
    ] as ReceiptItem[]
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Helper function to ensure data is array
  const ensureArray = (data: any): any[] => {
    if (Array.isArray(data)) return data
    if (data && Array.isArray(data.items)) return data.items
    if (data && Array.isArray(data.data)) return data.data
    return []
  }

  useEffect(() => {
    if (isOpen) setLineProductQuery({})
  }, [isOpen])

  // Fetch data on mount
  useEffect(() => {
    if (isOpen) {
      setDataLoading(true)
      Promise.all([fetchVariants(), fetchSuppliers()]).finally(() => {
        setDataLoading(false)
      })
      
      // If editing, populate form with receipt data
      if (receipt) {
        nextItemKeyRef.current = 1
        setFormData({
          supplier_id: receipt.supplier_id,
          note: receipt.note || '',
          items: [
            { _key: 0, variant_id: 0, product_id: 0, size_id: 0, quantity: 1, unit_price: 0, note: '' }
          ]
        })
      } else {
        nextItemKeyRef.current = 1
        setFormData({
          supplier_id: 0,
          note: '',
          items: [
            { _key: 0, variant_id: 0, product_id: 0, size_id: 0, quantity: 1, unit_price: 0, note: '' }
          ]
        })
      }
      setErrors({})
    }
  }, [isOpen, receipt])

  const fetchVariants = async () => {
    try {
      const { token } = getAuthData()
      const response = await fetch('/api/backend/v1/products/variants', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      console.log('Variants API Response:', data) // Debug log
      if (data.success) {
        // Handle paginated response like other APIs
        const variantsList = ensureArray(data.data)
        setVariants(variantsList)
      } else {
        console.error('Failed to fetch variants:', data.message)
        setVariants([])
        toast.error(t('failedToFetchVariants'))
      }
    } catch (error) {
      console.error('Error fetching variants:', error)
      setVariants([])
      toast.error(t('failedToFetchVariants'))
    }
  }

  const fetchSuppliers = async () => {
    try {
      const { token } = getAuthData()
      const response = await fetch('/api/backend/v1/suppliers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      console.log('Suppliers API Response:', data) // Debug log
      if (data.success) {
        // Handle paginated response like Supplier Management
        const suppliersList = ensureArray(data.data)
        setSuppliers(suppliersList)
      } else {
        console.error('Failed to fetch suppliers:', data.message)
        setSuppliers([])
        toast.error(t('failedToFetchSuppliers'))
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      setSuppliers([])
      toast.error(t('failedToFetchSuppliers'))
    }
  }

  const calculateSubtotal = (item: ReceiptItem) => {
    return item.quantity * item.unit_price
  }

  const calculateTotal = () => {
    return formData.items.reduce((total, item) => total + calculateSubtotal(item), 0)
  }

  const productOptions = useMemo(() => {
    const uniqueProducts = new Map<number, string>()
    variants.forEach((variant) => {
      if (!uniqueProducts.has(variant.product_id)) {
        uniqueProducts.set(variant.product_id, variant.product_name)
      }
    })
    return Array.from(uniqueProducts.entries()).map(([product_id, product_name]) => ({
      product_id,
      product_name
    }))
  }, [variants])

  const getSizesByProductId = (productId: number) => {
    if (!productId) return []
    const seenSizes = new Set<number>()
    return variants
      .filter((variant) => variant.product_id === productId)
      .filter((variant) => {
        if (seenSizes.has(variant.size_id)) return false
        seenSizes.add(variant.size_id)
        return true
      })
      .map((variant) => ({
        size_id: variant.size_id,
        size_name: variant.size_name
      }))
  }

  const addItem = () => {
    const k = nextItemKeyRef.current++
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { _key: k, variant_id: 0, product_id: 0, size_id: 0, quantity: 1, unit_price: 0, note: '' }]
    }))
  }

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const rowKey = formData.items[index]?._key
      if (rowKey !== undefined) {
        setLineProductQuery((prev) => {
          const { [rowKey]: _, ...rest } = prev
          return rest
        })
      }
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }))
    }
  }

  const updateItem = (index: number, field: keyof ReceiptItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (formData.supplier_id <= 0) {
      newErrors.supplier_id = t('pleaseSelectSupplier')
    }

    if (formData.items.length === 0) {
      newErrors.items = t('atLeastOneItemRequired')
    }

    formData.items.forEach((item, index) => {
      if (item.variant_id <= 0) {
        newErrors[`item_${index}_variant`] = t('pleaseSelectProduct')
      }
      if (item.size_id <= 0) {
        newErrors[`item_${index}_size`] = t('pleaseSelectSize')
      }
      if (item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = t('quantityMustBePositive')
      }
      if (item.unit_price <= 0) {
        newErrors[`item_${index}_price`] = t('unitPriceMustBePositive')
      } else if (violatesVndPriceStep(item.unit_price)) {
        newErrors[`item_${index}_price`] = t('priceStepMismatch')
      }
    })

    const variantIds = formData.items.map(item => item.variant_id).filter(id => id > 0)
    const uniqueVariantIds = new Set(variantIds)
    if (variantIds.length !== uniqueVariantIds.size) {
      newErrors.items = t('duplicateProductsNotAllowed')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const { token } = getAuthData()
      
      const payload = {
        supplier_id: formData.supplier_id,
        note: formData.note,
        items: formData.items
          .filter(item => item.variant_id > 0)
          .map(({ _key, ...item }) => item)
      }

      const url = receipt 
        ? `/api/backend/v1/purchase-receipts?id=${receipt.receipt_id}`
        : '/api/backend/v1/purchase-receipts'
      
      const method = receipt ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (data.success) {
        toast.success(receipt ? t('receiptUpdatedSuccessfully') : t('receiptCreatedSuccessfully'))
        onSaved()
      } else {
        toast.error(data.message || t('failedToSaveReceipt'))
      }
    } catch (error) {
      console.error('Error saving receipt:', error)
      toast.error(t('failedToSaveReceipt'))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  if (dataLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">{t('loading')}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {receipt ? t('editPurchaseReceipt') : t('createPurchaseReceipt')}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form noValidate onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Supplier Selection */}
          <div className="space-y-2">
            <Label htmlFor="supplier">{t('receiptSupplierLabel')} *</Label>
            <Select
              value={formData.supplier_id.toString()}
              onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectSupplier')} />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(suppliers) && suppliers.length > 0 ? (
                  suppliers.map(supplier => (
                    <SelectItem key={supplier.supplier_id} value={supplier.supplier_id.toString()}>
                      {supplier.supplier_name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="0" disabled>
                    {dataLoading ? t('loadingSuppliers') : t('noSuppliersAvailable')}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.supplier_id && (
              <p className="text-sm text-red-600">{errors.supplier_id}</p>
            )}
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">{t('receiptItemsLabel')} *</Label>
              <Button type="button" onClick={addItem} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                {t('addItem')}
              </Button>
            </div>
            
            {errors.items && (
              <p className="text-sm text-red-600">{errors.items}</p>
            )}

            <div className="space-y-3">
              {formData.items.map((item, index) => {
                const q = (lineProductQuery[item._key] ?? '').toLowerCase().trim()
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
                <Card key={item._key}>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {/* Product Selection (searchable) */}
                      <div className="space-y-2">
                        <Label>{t('productLabel')} *</Label>
                        <Select
                          value={item.product_id > 0 ? String(item.product_id) : 'none'}
                          onValueChange={(value) => {
                            const productId = value === 'none' ? 0 : parseInt(value, 10)
                            setFormData((prev) => ({
                              ...prev,
                              items: prev.items.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, product_id: productId, size_id: 0, variant_id: 0 }
                                  : row
                              )
                            }))
                          }}
                        >
                          <SelectTrigger className="h-10 w-full border-slate-200 bg-white text-left text-sm">
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
                                  value={lineProductQuery[item._key] ?? ''}
                                  onChange={(e) =>
                                    setLineProductQuery((prev) => ({
                                      ...prev,
                                      [item._key]: e.target.value
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
                              <SelectItem value="none">{t('selectProduct')}</SelectItem>
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
                        {errors[`item_${index}_variant`] && (
                          <p className="text-sm text-red-600">{errors[`item_${index}_variant`]}</p>
                        )}
                      </div>

                      {/* Size Selection */}
                      <div className="space-y-2">
                        <Label>{t('size')} *</Label>
                        <Select
                          value={item.size_id > 0 ? String(item.size_id) : 'none'}
                          onValueChange={(value) => {
                            const sizeId = value === 'none' ? 0 : parseInt(value, 10)
                            const matchedVariant = variants.find(
                              (variant) => variant.product_id === item.product_id && variant.size_id === sizeId
                            )
                            setFormData(prev => ({
                              ...prev,
                              items: prev.items.map((row, rowIndex) =>
                                rowIndex === index
                                  ? {
                                      ...row,
                                      size_id: sizeId,
                                      variant_id: matchedVariant?.variant_id ?? 0
                                    }
                                  : row
                              )
                            }))
                          }}
                          disabled={item.product_id <= 0}
                        >
                          <SelectTrigger className="h-10 w-full border-slate-200 bg-white text-left text-sm">
                            <SelectValue placeholder={item.product_id > 0 ? t('selectSize') : t('selectProductFirst')} />
                          </SelectTrigger>
                          <SelectContent className="z-[200] max-h-72" position="popper" sideOffset={4}>
                            <SelectItem value="none">{t('selectSize')}</SelectItem>
                            {getSizesByProductId(item.product_id).map((sizeOption) => (
                              <SelectItem key={sizeOption.size_id} value={String(sizeOption.size_id)}>
                                {sizeOption.size_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors[`item_${index}_size`] && (
                          <p className="text-sm text-red-600">{errors[`item_${index}_size`]}</p>
                        )}
                      </div>

                      {/* Quantity */}
                      <div className="space-y-2">
                        <Label>{t('quantityLabel')} *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        />
                        {errors[`item_${index}_quantity`] && (
                          <p className="text-sm text-red-600">{errors[`item_${index}_quantity`]}</p>
                        )}
                      </div>

                      {/* Unit Price */}
                      <div className="space-y-2">
                        <Label>{t('unitPriceVnd')} *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1000"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        />
                        {errors[`item_${index}_price`] && (
                          <p className="text-sm text-red-600">{errors[`item_${index}_price`]}</p>
                        )}
                      </div>

                      {/* Subtotal & Actions */}
                      <div className="space-y-2">
                        <Label>{t('subtotalLabel')}</Label>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 p-2 bg-gray-50 rounded text-sm font-medium">
                            {calculateSubtotal(item).toLocaleString('vi-VN')} ₫
                          </div>
                          {formData.items.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Item Note */}
                    <div className="mt-3">
                      <Label>{t('itemNoteOptional')}</Label>
                      <Input
                        placeholder={t('addNoteForItem')}
                        value={item.note}
                        onChange={(e) => updateItem(index, 'note', e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
                )
              })}
            </div>
          </div>

          {/* Total Amount */}
          <Card className="bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">{t('totalAmountLabel')}</span>
                <span className="text-xl font-bold text-blue-600">
                  {calculateTotal().toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">{t('receiptNoteOptional')}</Label>
            <Textarea
              id="note"
              placeholder={t('addNoteForReceipt')}
              value={formData.note}
              onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading} className="inline-flex items-center gap-2">
              {loading ? t('saving') : (receipt ? t('updateReceiptButton') : t('createReceipt'))}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
