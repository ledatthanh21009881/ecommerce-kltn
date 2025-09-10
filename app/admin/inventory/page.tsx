'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, RefreshCw, Package, Edit, Trash2, Eye, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import ConfirmModal from '@/components/ui/confirm-modal'
import InventoryModal from '@/components/admin/InventoryModal'
import { InventoryVariant, Product } from '@/lib/types'
import { getAuthData } from '@/lib/admin-auth'
import { useLanguage } from '@/contexts/LanguageContext'

export default function AdminInventoryPage() {
  const { t } = useLanguage()
  const [variants, setVariants] = useState<InventoryVariant[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState<InventoryVariant | null>(null)
  const [deletingVariantId, setDeletingVariantId] = useState<number | null>(null)

  // Fetch inventory data
  const fetchInventory = async () => {
    try {
      setLoading(true)
      const { token } = getAuthData()
      
      // Use Next.js proxy to backend API
      const url = '/api/backend/v1/inventory'
      console.log('🌐 Fetching inventory from:', url)
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      console.log('Inventory API Response:', data)
      
      if (data.success) {
        // API trả về data.data là array, không phải data.data.variants
        const inventoryData = Array.isArray(data.data) ? data.data : (data.data.variants || [])
        setVariants(inventoryData)
        console.log('Variants set:', inventoryData)
      } else {
        console.error('API Error:', data)
        toast.error(data.message || t('failedToFetch'))
      }
    } catch (error) {
      console.error('Fetch Inventory Error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(t('errorFetching'))
    } finally {
      setLoading(false)
    }
  }

  // Fetch products for dropdown
  const fetchProducts = async () => {
    try {
      const { token } = getAuthData()
      console.log('🔄 Fetching products with token:', !!token)
      
      const response = await fetch('/api/backend/v1/products?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      console.log('📥 Products response status:', response.status)
      
      const data = await response.json()
      console.log('📦 Products data:', data)
      
      if (data.success) {
        // Backend returns paginated format with data.items
        const productsData = data.data?.items || data.data || []
        console.log('✅ Products fetched successfully, count:', productsData.length)
        setProducts(productsData)
      } else {
        console.log('❌ Products fetch failed:', data.message)
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error)
    }
  }

  // Fetch categories for filter
  const fetchCategories = async () => {
    try {
      const { token } = getAuthData()
      const response = await fetch('/api/backend/v1/categories', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      
      if (data.success) {
        setCategories(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  useEffect(() => {
    fetchInventory()
    fetchProducts()
    fetchCategories()
  }, [selectedProduct, selectedStatus])

  // Filter variants based on search term
  const filteredVariants = variants.filter(variant => {
    const matchesSearch = variant.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         variant.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         variant.size_name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // Handle inventory operations
  const handleViewVariant = (variant: InventoryVariant) => {
    toast.info(`Inventory: ${variant.product_name} - ${variant.size_name}`, {
      description: `SKU: ${variant.sku}, Stock: ${variant.stock_quantity}, Status: ${variant.status}`
    })
  }

  const handleEditVariant = (variant: InventoryVariant) => {
    setEditingVariant(variant)
    setIsModalOpen(true)
  }

  const handleAddVariant = () => {
    setEditingVariant(null)
    setIsModalOpen(true)
  }

  const handleDeleteVariant = (variantId: number) => {
    setDeletingVariantId(variantId)
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteVariant = async () => {
    if (!deletingVariantId) return

    try {
      const { token } = getAuthData()
      console.log('🗑️ Deleting inventory ID:', deletingVariantId)
      
      const response = await fetch(`/api/backend/v1/inventory/delete?id=${deletingVariantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('📥 Delete response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.log('❌ Delete error response:', errorText)
        
        if (response.status === 401) {
          toast.error(t('authenticationFailed'))
          return
        }
        
        toast.error(t('deleteFailed'))
        return
      }

      const data = await response.json()
      console.log('✅ Delete response data:', data)
      
      if (data.success) {
        toast.success(t('inventoryDeletedSuccessfully'))
        fetchInventory()
      } else {
        toast.error(data.message || t('failedToDeleteInventory'))
      }
    } catch (error) {
      console.error('❌ Error deleting inventory:', error)
      
      if (error instanceof SyntaxError) {
        toast.error(t('invalidResponse'))
      } else if (error instanceof TypeError) {
        toast.error(t('networkError'))
      } else {
        toast.error(`Error deleting inventory: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } finally {
      setDeletingVariantId(null)
    }
  }

  // Calculate stats
  const totalVariants = variants.length
  const inStockVariants = variants.filter(v => v.status === 'in_stock').length
  const outOfStockVariants = variants.filter(v => v.status === 'out_of_stock').length
  const lowStockVariants = variants.filter(v => v.stock_quantity < 5 && v.stock_quantity > 0).length

  // Get stock warning level
  const getStockWarningLevel = (quantity: number) => {
    if (quantity === 0) return 'out-of-stock'
    if (quantity < 5) return 'low-stock'
    if (quantity < 10) return 'medium-stock'
    return 'good-stock'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('inventoryManagement')}</h1>
          <p className="text-slate-600">{t('inventoryManagementDesc')}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('totalVariants')}</p>
                  <p className="text-2xl font-bold text-slate-900">{totalVariants}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('inStock')}</p>
                  <p className="text-2xl font-bold text-green-600">{inStockVariants}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-xl">✅</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('outOfStock')}</p>
                  <p className="text-2xl font-bold text-red-600">{outOfStockVariants}</p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 text-xl">❌</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('lowStock')}</p>
                  <p className="text-2xl font-bold text-orange-600">{lowStockVariants}</p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="bg-white shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col lg:flex-row gap-4 flex-1 w-full">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder={t('searchByProductSkuSize')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Product Filter */}
                <div className="flex-1 max-w-xs">
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('allProducts')}</option>
                    {products && products.length > 0 && products.map((product) => (
                      <option key={product.product_id} value={product.product_id}>
                        {product.product_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex-1 max-w-xs">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">{t('allStatus')}</option>
                    <option value="in_stock">{t('inStock')}</option>
                    <option value="out_of_stock">{t('outOfStock')}</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={fetchInventory}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  {t('refresh')}
                </Button>
                <Button
                  onClick={handleAddVariant}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  {t('addInventory')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Table */}
        <Card className="bg-white shadow-sm">
          <CardContent className="p-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg animate-pulse">
                    <div className="h-10 w-10 bg-gray-200 rounded"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 w-8 bg-gray-200 rounded"></div>
                      <div className="h-8 w-8 bg-gray-200 rounded"></div>
                      <div className="h-8 w-8 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredVariants.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noInventoryFound')}</h3>
                <p className="text-gray-600">{t('getStartedByCreatingInventory')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">{t('product')}</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">{t('size')}</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">{t('sku')}</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">{t('stock')}</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">{t('status')}</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVariants.map((variant) => {
                      const stockLevel = getStockWarningLevel(variant.stock_quantity)
                      return (
                        <tr key={variant.variant_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 bg-blue-100 rounded flex items-center justify-center">
                                <Package className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{variant.product_name}</div>
                                <div className="text-sm text-gray-500">ID: {variant.product_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant="outline">{variant.size_name}</Badge>
                          </td>
                          <td className="py-4 px-4 text-gray-600 font-mono text-sm">{variant.sku}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${
                                stockLevel === 'out-of-stock' ? 'text-red-600' :
                                stockLevel === 'low-stock' ? 'text-orange-600' :
                                stockLevel === 'medium-stock' ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>
                                {variant.stock_quantity}
                              </span>
                              {stockLevel === 'low-stock' && (
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant={variant.status === 'in_stock' ? 'default' : 'secondary'}>
                              {variant.status === 'in_stock' ? t('inStock') : t('outOfStock')}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleViewVariant(variant)}
                                className="bg-white text-gray-900 hover:bg-gray-100"
                                title={t('view')}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleEditVariant(variant)}
                                className="bg-white text-gray-900 hover:bg-gray-100"
                                title={t('edit')}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteVariant(variant.variant_id)}
                                className="bg-red-600 hover:bg-red-700"
                                title={t('delete')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inventory Modal */}
        <InventoryModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingVariant(null)
          }}
          variant={editingVariant}
          products={products}
          categories={categories}
          onSaved={fetchInventory}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false)
            setDeletingVariantId(null)
          }}
          onConfirm={confirmDeleteVariant}
          title={t('deleteInventory')}
          description={t('deleteInventoryConfirm')}
          confirmText={t('delete')}
          cancelText={t('cancel')}
        />
      </div>
    </div>
  )
}
