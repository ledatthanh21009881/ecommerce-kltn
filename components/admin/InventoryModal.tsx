'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { InventoryVariant, InventoryFormData, Product } from '@/lib/types'
import { getAuthData } from '@/lib/admin-auth'

interface InventoryModalProps {
  isOpen: boolean
  onClose: () => void
  variant: InventoryVariant | null
  products: Product[]
  onSaved: () => void
}

export default function InventoryModal({ isOpen, onClose, variant, products, onSaved }: InventoryModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<InventoryFormData>({
    product_id: 0,
    size_id: 0,
    sku: '',
    stock_quantity: 0,
    status: 'in_stock'
  })

  // Initialize form data when variant changes
  useEffect(() => {
    if (variant) {
      setFormData({
        product_id: variant.product_id,
        size_id: variant.size_id,
        sku: variant.sku,
        stock_quantity: variant.stock_quantity,
        status: variant.status
      })
    } else {
      // Reset form for new variant
      setFormData({
        product_id: 0,
        size_id: 0,
        sku: '',
        stock_quantity: 0,
        status: 'in_stock'
      })
    }
  }, [variant])

  const handleInputChange = (field: keyof InventoryFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const generateSKU = () => {
    if (formData.product_id && formData.size_id) {
      const product = products.find(p => p.product_id === formData.product_id)
      const sizeNames = ['S', 'M', 'L', 'XL']
      const sizeName = sizeNames[formData.size_id - 1] || 'S'
      
      if (product) {
        const productCode = product.product_name
          .split(' ')
          .map(word => word.charAt(0).toUpperCase())
          .join('')
          .substring(0, 4)
        
        const sku = `${productCode}-${sizeName}-${Date.now().toString().slice(-4)}`
        setFormData(prev => ({ ...prev, sku }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.product_id || !formData.size_id || !formData.sku.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    if (formData.stock_quantity < 0) {
      toast.error('Stock quantity cannot be negative')
      return
    }

    setLoading(true)

    try {
      const { token } = getAuthData()
      const url = variant 
        ? `/api/backend/v1/inventory/${variant.variant_id}`
        : '/api/backend/v1/inventory'
      
      const method = variant ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success(variant ? 'Inventory updated successfully' : 'Inventory created successfully')
        onSaved()
        onClose()
      } else {
        toast.error(data.message || 'Failed to save inventory')
      }
    } catch (error) {
      console.error('Error saving inventory:', error)
      toast.error('Error saving inventory')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-white bg-opacity-80 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-blue-100 rounded flex items-center justify-center">
              <Package className="h-4 w-4 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {variant ? 'Edit Inventory' : 'Add New Inventory'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Product Selection */}
          <div className="space-y-2">
            <Label htmlFor="product_id" className="text-sm font-medium text-gray-700">
              Product *
            </Label>
            <select
              id="product_id"
              value={formData.product_id}
              onChange={(e) => handleInputChange('product_id', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Product</option>
              {products && products.length > 0 && products.map((product) => (
                <option key={product.product_id} value={product.product_id}>
                  {product.product_name}
                </option>
              ))}
            </select>
          </div>

          {/* Size Selection */}
          <div className="space-y-2">
            <Label htmlFor="size_id" className="text-sm font-medium text-gray-700">
              Size *
            </Label>
            <select
              id="size_id"
              value={formData.size_id}
              onChange={(e) => handleInputChange('size_id', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Size</option>
              <option value={1}>S</option>
              <option value={2}>M</option>
              <option value={3}>L</option>
              <option value={4}>XL</option>
            </select>
          </div>

          {/* SKU */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sku" className="text-sm font-medium text-gray-700">
                SKU *
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateSKU}
                className="text-xs"
              >
                Generate SKU
              </Button>
            </div>
            <Input
              id="sku"
              value={formData.sku}
              onChange={(e) => handleInputChange('sku', e.target.value)}
              placeholder="e.g., PROD-S-001"
              className="w-full"
              required
            />
            <p className="text-xs text-gray-500">
              Stock Keeping Unit - unique identifier for this variant
            </p>
          </div>

          {/* Stock Quantity */}
          <div className="space-y-2">
            <Label htmlFor="stock_quantity" className="text-sm font-medium text-gray-700">
              Stock Quantity *
            </Label>
            <Input
              id="stock_quantity"
              type="number"
              value={formData.stock_quantity}
              onChange={(e) => handleInputChange('stock_quantity', parseInt(e.target.value) || 0)}
              placeholder="0"
              min="0"
              className="w-full"
              required
            />
            <p className="text-xs text-gray-500">
              Current stock level for this variant
            </p>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm font-medium text-gray-700">
              Status *
            </Label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value as 'in_stock' | 'out_of_stock')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="in_stock">In Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
            <p className="text-xs text-gray-500">
              Current availability status
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {variant ? 'Update Inventory' : 'Create Inventory'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
