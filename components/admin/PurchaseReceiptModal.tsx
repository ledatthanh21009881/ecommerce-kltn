'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { getAuthData } from '@/lib/admin-auth'

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
  variant_id: number
  quantity: number
  unit_price: number
  note: string
}

export default function PurchaseReceiptModal({ isOpen, onClose, receipt, onSaved }: PurchaseReceiptModalProps) {
  const [loading, setLoading] = useState(false)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [formData, setFormData] = useState({
    supplier_id: 0,
    note: '',
    items: [
      { variant_id: 0, quantity: 1, unit_price: 0, note: '' }
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

  // Fetch data on mount
  useEffect(() => {
    if (isOpen) {
      setDataLoading(true)
      Promise.all([fetchVariants(), fetchSuppliers()]).finally(() => {
        setDataLoading(false)
      })
      
      // If editing, populate form with receipt data
      if (receipt) {
        setFormData({
          supplier_id: receipt.supplier_id,
          note: receipt.note || '',
          items: [
            { variant_id: 0, quantity: 1, unit_price: 0, note: '' }
          ]
        })
      } else {
        // Reset form for new receipt
        setFormData({
          supplier_id: 0,
          note: '',
          items: [
            { variant_id: 0, quantity: 1, unit_price: 0, note: '' }
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
        toast.error('Failed to fetch product variants')
      }
    } catch (error) {
      console.error('Error fetching variants:', error)
      setVariants([])
      toast.error('Error fetching product variants')
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
        toast.error('Failed to fetch suppliers')
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      setSuppliers([])
      toast.error('Error fetching suppliers')
    }
  }

  const calculateSubtotal = (item: ReceiptItem) => {
    return item.quantity * item.unit_price
  }

  const calculateTotal = () => {
    return formData.items.reduce((total, item) => total + calculateSubtotal(item), 0)
  }

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { variant_id: 0, quantity: 1, unit_price: 0, note: '' }]
    }))
  }

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
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
      newErrors.supplier_id = 'Please select a supplier'
    }

    if (formData.items.length === 0) {
      newErrors.items = 'At least one item is required'
    }

    formData.items.forEach((item, index) => {
      if (item.variant_id <= 0) {
        newErrors[`item_${index}_variant`] = 'Please select a product'
      }
      if (item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = 'Quantity must be greater than 0'
      }
      if (item.unit_price <= 0) {
        newErrors[`item_${index}_price`] = 'Unit price must be greater than 0'
      }
    })

    // Check for duplicate variants
    const variantIds = formData.items.map(item => item.variant_id).filter(id => id > 0)
    const uniqueVariantIds = new Set(variantIds)
    if (variantIds.length !== uniqueVariantIds.size) {
      newErrors.items = 'Duplicate products are not allowed'
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
        items: formData.items.filter(item => item.variant_id > 0)
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
        toast.success(receipt ? 'Receipt updated successfully' : 'Receipt created successfully')
        onSaved()
      } else {
        toast.error(data.message || 'Failed to save receipt')
      }
    } catch (error) {
      console.error('Error saving receipt:', error)
      toast.error('Error saving receipt')
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
            <span className="ml-3 text-gray-600">Loading...</span>
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
            {receipt ? 'Edit Purchase Receipt' : 'Create Purchase Receipt'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Supplier Selection */}
          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier *</Label>
            <Select
              value={formData.supplier_id.toString()}
              onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a supplier" />
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
                    {dataLoading ? 'Loading suppliers...' : 'No suppliers available'}
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
              <Label className="text-base font-medium">Items *</Label>
              <Button type="button" onClick={addItem} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
            
            {errors.items && (
              <p className="text-sm text-red-600">{errors.items}</p>
            )}

            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Product Selection */}
                      <div className="space-y-2">
                        <Label>Product *</Label>
                        <Select
                          value={item.variant_id.toString()}
                          onValueChange={(value) => updateItem(index, 'variant_id', parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(variants) && variants.length > 0 ? (
                              variants.map(variant => (
                                <SelectItem key={variant.variant_id} value={variant.variant_id.toString()}>
                                  {variant.display_name} (Stock: {variant.stock_quantity})
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="0" disabled>
                                {dataLoading ? 'Loading variants...' : 'No variants available'}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {errors[`item_${index}_variant`] && (
                          <p className="text-sm text-red-600">{errors[`item_${index}_variant`]}</p>
                        )}
                      </div>

                      {/* Quantity */}
                      <div className="space-y-2">
                        <Label>Quantity *</Label>
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
                        <Label>Unit Price (₫) *</Label>
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
                        <Label>Subtotal</Label>
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
                      <Label>Item Note (Optional)</Label>
                      <Input
                        placeholder="Add note for this item..."
                        value={item.note}
                        onChange={(e) => updateItem(index, 'note', e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Total Amount */}
          <Card className="bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Total Amount:</span>
                <span className="text-xl font-bold text-blue-600">
                  {calculateTotal().toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Receipt Note (Optional)</Label>
            <Textarea
              id="note"
              placeholder="Add a note for this receipt..."
              value={formData.note}
              onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? 'Saving...' : (receipt ? 'Update Receipt' : 'Create Receipt')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
