'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { InventoryVariant, InventoryFormData, Product } from '@/lib/types'
import { getAuthData } from '@/lib/admin-auth'
import { useLanguage } from '@/contexts/LanguageContext'

interface InventoryModalProps {
  isOpen: boolean
  onClose: () => void
  variant: InventoryVariant | null
  products: Product[]
  categories: any[]
  onSaved: () => void
}

export default function InventoryModal({ isOpen, onClose, variant, products, categories, onSaved }: InventoryModalProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
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
      setSelectedCategory('')
    }
  }, [variant])

  // Filter products by selected category
  const filteredProducts = selectedCategory 
    ? (Array.isArray(products) ? products.filter(product => product.category_id.toString() === selectedCategory) : [])
    : (Array.isArray(products) ? products : [])

  // Auto-select category when product is selected
  const handleProductChange = (productId: number) => {
    handleInputChange('product_id', productId)
    
    // Auto-select category for the chosen product
    if (productId > 0 && Array.isArray(products)) {
      const selectedProduct = products.find(p => p.product_id === productId)
      if (selectedProduct) {
        setSelectedCategory(selectedProduct.category_id.toString())
      }
    }
  }

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
    
    // Validate required fields
    if (!formData.product_id || formData.product_id <= 0) {
      toast.error(t('pleaseSelectProduct'))
      return
    }
    
    if (!formData.size_id || formData.size_id <= 0) {
      toast.error(t('pleaseSelectSize'))
      return
    }
    
    if (!formData.sku.trim()) {
      toast.error(t('pleaseEnterSku'))
      return
    }

    if (formData.stock_quantity < 0) {
      toast.error(t('stockQuantityCannotBeNegative'))
      return
    }
    
    console.log('✅ Form validation passed, data:', formData)

    setLoading(true)

    try {
      const { token } = getAuthData()
      console.log('🔑 Token from getAuthData:', token ? 'Present' : 'Missing')
      
      console.log('🔍 Variant ID debug:', variant?.variant_id, typeof variant?.variant_id)
      
      // Ensure variant_id is a clean number
      const cleanVariantId = variant?.variant_id ? parseInt(variant.variant_id.toString().split(':')[0]) : null
      console.log('🧹 Clean variant ID:', cleanVariantId)
      
      const url = variant 
        ? `/api/backend/v1/inventory/update?id=${cleanVariantId}`
        : '/api/backend/v1/inventory'
      
      const method = variant ? 'PUT' : 'POST'
      
      console.log('🔍 Original formData:', JSON.stringify(formData, null, 2))
      
      // For update, only send fields that can be changed
      const requestData = variant 
        ? {
            size_id: formData.size_id,
            sku: formData.sku,
            stock_quantity: formData.stock_quantity,
            status: formData.status
          }
        : formData
      
      console.log('🔍 Is update mode:', !!variant)
      
      console.log('🌐 Making inventory request to:', url)
      console.log('📤 Request method:', method)
      console.log('📋 Request data:', JSON.stringify(requestData, null, 2))
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      console.log('📥 Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.log('❌ Error response:', errorText)
        
        if (response.status === 401) {
          toast.error(t('authenticationFailed'))
          return
        }
        
        toast.error(t('requestFailed'))
        return
      }

      const data = await response.json()
      console.log('✅ Response data:', data)
      
      if (data.success) {
        toast.success(variant ? t('inventoryUpdatedSuccessfully') : t('inventoryCreatedSuccessfully'))
        onSaved()
        onClose()
      } else {
        toast.error(data.message || t('failedToSaveInventory'))
      }
    } catch (error) {
      console.error('❌ Error saving inventory:', error)
      
      if (error instanceof SyntaxError) {
        toast.error(t('invalidResponse'))
      } else if (error instanceof TypeError) {
        toast.error(t('networkError'))
      } else {
        toast.error(`Error saving inventory: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
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
              {variant ? t('editInventory') : t('addNewInventory')}
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
          {/* Category Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="category_filter" className="text-sm font-medium text-gray-700">
                {t('filterByCategory')}
              </Label>
              <span className="text-xs text-gray-500">
                {filteredProducts.length} {t('products')}
              </span>
            </div>
            <select
              id="category_filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('allCategories')} ({Array.isArray(products) ? products.length : 0} {t('products')})</option>
              {categories && categories.length > 0 && categories.map((category) => {
                const categoryProductCount = Array.isArray(products) ? products.filter(p => p.category_id.toString() === category.category_id.toString()).length : 0
                return (
                  <option key={category.category_id} value={category.category_id}>
                    {category.category_name} ({categoryProductCount} {t('products')})
                  </option>
                )
              })}
            </select>
          </div>

          {/* Product Selection */}
          <div className="space-y-2">
            <Label htmlFor="product_id" className="text-sm font-medium text-gray-700">
              {t('product')} *
            </Label>
            <select
              id="product_id"
              value={formData.product_id || ''}
              onChange={(e) => handleProductChange(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">{t('selectProduct')}</option>
              {filteredProducts && filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <option key={product.product_id} value={product.product_id}>
                    {product.product_name}
                  </option>
                ))
              ) : (
                <option value="" disabled>{t('noProductsFound')}</option>
              )}
            </select>
            {filteredProducts.length === 0 && selectedCategory && (
              <p className="text-xs text-gray-500">{t('noProductsInThisCategory')}</p>
            )}
            {formData.product_id > 0 && Array.isArray(products) && (
              <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                <div className="text-sm">
                  <div className="font-medium text-blue-900">
                    {products.find(p => p.product_id === formData.product_id)?.product_name}
                  </div>
                  <div className="text-blue-700 text-xs">
                    Price: {products.find(p => p.product_id === formData.product_id)?.list_price?.toLocaleString()} ₫
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Size Selection */}
          <div className="space-y-2">
            <Label htmlFor="size_id" className="text-sm font-medium text-gray-700">
              {t('size')} *
            </Label>
            <select
              id="size_id"
              value={formData.size_id || ''}
              onChange={(e) => handleInputChange('size_id', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">{t('selectSize')}</option>
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
                {t('sku')} *
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateSKU}
                className="text-xs"
              >
                {t('generateSku')}
              </Button>
            </div>
            <Input
              id="sku"
              value={formData.sku}
              onChange={(e) => handleInputChange('sku', e.target.value)}
              placeholder={t('skuPlaceholder')}
              className="w-full"
              required
            />
            <p className="text-xs text-gray-500">
              {t('skuHelperText')}
            </p>
          </div>

          {/* Stock Quantity */}
          <div className="space-y-2">
            <Label htmlFor="stock_quantity" className="text-sm font-medium text-gray-700">
              {t('stockQuantity')} *
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
              {t('stockQuantityHelperText')}
            </p>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm font-medium text-gray-700">
              {t('status')} *
            </Label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value as 'in_stock' | 'out_of_stock')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="in_stock">{t('inStock')}</option>
              <option value="out_of_stock">{t('outOfStock')}</option>
            </select>
            <p className="text-xs text-gray-500">
              {t('currentAvailabilityStatus')}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {variant ? t('updateInventory') : t('createInventory')}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
