'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, RefreshCw, Package, Edit, Trash2, Eye, AlertTriangle, LayoutList, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  const [selectedProduct, setSelectedProduct] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState<InventoryVariant | null>(null)
  const [deletingVariantId, setDeletingVariantId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [limit] = useState(15)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('admin_inventory_view') as 'list' | 'grid') || 'list'
    return 'list'
  })

  const setViewModeAndStore = (mode: 'list' | 'grid') => {
    setViewMode(mode)
    if (typeof window !== 'undefined') localStorage.setItem('admin_inventory_view', mode)
  }

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

  const totalPages = Math.max(1, Math.ceil(filteredVariants.length / limit))
  const from = filteredVariants.length === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, filteredVariants.length)
  const paginatedVariants = filteredVariants.slice((page - 1) * limit, page * limit)

  useEffect(() => {
    setPage(1)
  }, [searchTerm, selectedProduct, selectedStatus])

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="admin-page-title mb-2">{t('inventoryManagement')}</h1>
            <p className="admin-page-description">{t('inventoryManagementDesc')}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            <span className="text-sm font-medium text-slate-600 mr-1 hidden sm:inline">{t('view')}:</span>
            <div className="flex rounded-lg border border-slate-200 bg-white/80 overflow-hidden">
              <Button variant="ghost" size="sm" onClick={() => setViewModeAndStore('list')} className={`rounded-none ${viewMode === 'list' ? 'bg-slate-100' : ''}`} title={t('viewList')}>
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setViewModeAndStore('grid')} className={`rounded-none ${viewMode === 'grid' ? 'bg-slate-100' : ''}`} title={t('viewGrid')}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={fetchInventory} disabled={loading} className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('refresh')}
            </Button>
            <Button onClick={handleAddVariant} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('addInventory')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-blue-500/15 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('totalVariants')}</p>
                  <p className="text-3xl font-bold text-slate-900">{totalVariants}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-700">
                  <Package className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-500/15 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('inStock')}</p>
                  <p className="text-3xl font-bold text-slate-900">{inStockVariants}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700">
                  <Package className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-rose-500/15 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('outOfStock')}</p>
                  <p className="text-3xl font-bold text-slate-900">{outOfStockVariants}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-700">
                  <Package className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-amber-500/15 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('lowStock')}</p>
                  <p className="text-3xl font-bold text-slate-900">{lowStockVariants}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end justify-between">
              <div className="flex flex-col lg:flex-row gap-4 flex-1 w-full">
                <div className="flex flex-col flex-1 max-w-md">
                  <label className="text-xs font-medium text-slate-600 mb-1">{t('search')}</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder={t('searchByProductSkuSize')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">{t('product')}</label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="min-w-[180px] border-slate-200 bg-white/50 focus:bg-white">
                      <SelectValue placeholder={t('allProducts')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allProducts')}</SelectItem>
                      {products && products.length > 0 && products.map((product) => (
                        <SelectItem key={product.product_id} value={String(product.product_id)}>
                          {product.product_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">{t('statusFilter')}</label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="min-w-[160px] border-slate-200 bg-white/50 focus:bg-white">
                      <SelectValue placeholder={t('allStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allStatus')}</SelectItem>
                      <SelectItem value="in_stock">{t('inStock')}</SelectItem>
                      <SelectItem value="out_of_stock">{t('outOfStock')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg animate-pulse">
                    <div className="h-10 w-10 bg-slate-200 rounded" />
                    <div className="flex-1">
                      <div className="h-4 bg-slate-200 rounded mb-2" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 w-8 bg-slate-200 rounded" />
                      <div className="h-8 w-8 bg-slate-200 rounded" />
                      <div className="h-8 w-8 bg-slate-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredVariants.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">{t('noInventoryFound')}</h3>
                <p className="text-slate-600">{t('getStartedByCreatingInventory')}</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedVariants.map((variant) => {
                  const stockLevel = getStockWarningLevel(variant.stock_quantity)
                  return (
                    <Card key={variant.variant_id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="h-10 w-10 bg-blue-100 rounded flex items-center justify-center">
                              <Package className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-slate-900 line-clamp-1">{variant.product_name}</div>
                              <div className="text-xs text-slate-500 font-mono">{variant.sku}</div>
                            </div>
                          </div>
                          <Badge
                            variant={variant.status === 'in_stock' ? 'default' : 'secondary'}
                            className={variant.status === 'in_stock' ? 'bg-emerald-600 text-white hover:bg-emerald-600' : undefined}
                          >
                            {variant.status === 'in_stock' ? t('inStock') : t('outOfStock')}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm text-slate-600 mb-3">
                          <span>{t('size')}: <Badge variant="outline">{variant.size_name}</Badge></span>
                          <span className={`font-medium ${
                            stockLevel === 'out-of-stock' ? 'text-red-600' :
                            stockLevel === 'low-stock' ? 'text-orange-600' :
                            stockLevel === 'medium-stock' ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {variant.stock_quantity} {t('stock')}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleViewVariant(variant)} className="flex-1"><Eye className="h-4 w-4" /></Button>
                          <Button size="sm" variant="outline" onClick={() => handleEditVariant(variant)} className="flex-1"><Edit className="h-4 w-4" /></Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteVariant(variant.variant_id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('product')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('size')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('sku')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('stock')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('status')}</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-900">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedVariants.map((variant) => {
                      const stockLevel = getStockWarningLevel(variant.stock_quantity)
                      return (
                        <tr key={variant.variant_id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 bg-blue-100 rounded flex items-center justify-center">
                                <Package className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-slate-900">{variant.product_name}</div>
                                <div className="text-sm text-slate-500">ID: {variant.product_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant="outline">{variant.size_name}</Badge>
                          </td>
                          <td className="py-4 px-4 text-slate-600 font-mono text-sm">{variant.sku}</td>
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
                            <Badge
                              variant={variant.status === 'in_stock' ? 'default' : 'secondary'}
                              className={variant.status === 'in_stock' ? 'bg-emerald-600 text-white hover:bg-emerald-600' : undefined}
                            >
                              {variant.status === 'in_stock' ? t('inStock') : t('outOfStock')}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleViewVariant(variant)}
                                className="bg-white text-slate-900 hover:bg-white"
                                title={t('view')}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleEditVariant(variant)}
                                className="bg-white text-slate-900 hover:bg-white"
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

        {/* Pagination */}
        {!loading && filteredVariants.length > 0 && totalPages > 1 && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mt-6">
            <CardContent className="py-4 px-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-slate-600">
                  {t('showingXOfY', { from: String(from), to: String(to), total: String(filteredVariants.length) })}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="bg-white/80 border-slate-200">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-slate-600 px-2">{t('pageOf', { current: String(page), total: String(totalPages) })}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="bg-white/80 border-slate-200">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
