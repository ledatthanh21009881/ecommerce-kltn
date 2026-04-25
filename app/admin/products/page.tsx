'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Eye, Search, RefreshCw, Package, Star, LayoutList, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import ProductModal from '@/components/admin/ProductModal'
import ProductDetailModal from '@/components/admin/ProductDetailModal'
import ProductGrid from '@/components/admin/ProductGrid'
import ConfirmModal from '@/components/ui/confirm-modal'
import { Product } from '@/lib/types'
import { getAuthData, checkAndRefreshAuth } from '@/lib/admin-auth'
import { useLanguage } from '@/contexts/LanguageContext'
import { AdminPageHeading } from '@/components/admin/AdminPageHeading'

export default function AdminProductsPage() {
  const { t } = useLanguage()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [pagination, setPagination] = useState<{ total: number; per_page: number; current_page: number; last_page: number; from: number; to: number } | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('admin_products_view') as 'list' | 'grid') || 'grid'
    }
    return 'grid'
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null)
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null)
  const [categories, setCategories] = useState([])

  const setViewModeAndStore = (mode: 'list' | 'grid') => {
    setViewMode(mode)
    if (typeof window !== 'undefined') localStorage.setItem('admin_products_view', mode)
  }

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (selectedCategory) params.set('category_id', selectedCategory)
      if (searchTerm) params.set('search', searchTerm)
      const response = await fetch(`/api/backend/v1/products?${params.toString()}`)
      const data = await response.json()
      
      if (data.success) {
        setProducts(data.data.items || data.data || [])
        if (data.data.pagination) {
          setPagination({
            total: data.data.pagination.total,
            per_page: data.data.pagination.per_page,
            current_page: data.data.pagination.current_page,
            last_page: data.data.pagination.last_page,
            from: data.data.pagination.from ?? (page - 1) * limit + 1,
            to: data.data.pagination.to ?? Math.min(page * limit, data.data.pagination.total)
          })
        } else {
          setPagination(null)
        }
      } else {
        toast.error(t('failedToFetch'))
      }
    } catch (error) {
      toast.error(t('errorFetching'))
    } finally {
      setLoading(false)
    }
  }

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/backend/v1/categories')
      const data = await response.json()
      if (data.success) {
        setCategories(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  useEffect(() => {
    setPage(1)
  }, [selectedCategory, searchTerm])

  useEffect(() => {
    fetchProducts()
  }, [page, selectedCategory, searchTerm])

  useEffect(() => {
    fetchCategories()
  }, [])

  const filteredProducts = products

  // Handle product operations
  const handleCreateProduct = () => {
    setEditingProduct(null)
    setIsModalOpen(true)
  }

  const handleEditProduct = async (product: Product) => {
    try {
      // Fetch full product details including all images
      const response = await fetch(`/api/backend/v1/products/${product.product_id}`)
      const data = await response.json()
      
      if (data.success) {
        setEditingProduct(data.data)
      } else {
        setEditingProduct(product)
        toast.error('Failed to fetch product details')
      }
    } catch (error) {
      console.error('Error fetching product details:', error)
      setEditingProduct(product)
      toast.error('Error fetching product details')
    }
    setIsModalOpen(true)
  }

  const handleViewProduct = (product: Product) => {
    setViewingProduct(product)
    setIsDetailModalOpen(true)
  }

  const handleEditFromDetail = async () => {
    if (viewingProduct) {
      try {
        // Fetch full product details including all images
        const response = await fetch(`/api/backend/v1/products/${viewingProduct.product_id}`)
        const data = await response.json()
        
        if (data.success) {
          setEditingProduct(data.data)
      } else {
          setEditingProduct(viewingProduct)
          toast.error('Failed to fetch product details')
        }
      } catch (error) {
        console.error('Error fetching product details:', error)
        setEditingProduct(viewingProduct)
        toast.error('Error fetching product details')
      }
      setIsDetailModalOpen(false)
      setIsModalOpen(true)
    }
  }

  const handleDeleteProduct = (productId: number) => {
    setDeletingProductId(productId)
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteProduct = async () => {
    if (!deletingProductId) return

    try {
      const ok = await checkAndRefreshAuth()
      if (!ok) {
        if (typeof window !== 'undefined') window.location.href = '/admin-login'
        return
      }
      const { token } = getAuthData()
      const response = await fetch(`/api/backend/v1/products/delete?id=${deletingProductId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('Product deleted successfully')
        fetchProducts()
      } else {
        toast.error(data.message || 'Failed to delete product')
      }
    } catch (error) {
      toast.error('Error deleting product')
    } finally {
      setDeletingProductId(null)
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingProduct(null)
  }

  const handleProductSaved = () => {
    fetchProducts()
    handleModalClose()
  }
    
const formatPrice = (price: string | number) => {
    const num = typeof price === 'string' ? parseFloat(price) : price
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-50 text-green-700 border-green-200'
      case 'inactive': return 'bg-gray-50 text-gray-700 border-gray-200'
      case 'draft': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <AdminPageHeading
          title={t('productManagement')}
          description={t('manageYourCatalog')}
          actions={
            <>
              <span className="text-sm font-medium text-slate-600 mr-1 hidden sm:inline">{t('view')}:</span>
              <div className="flex rounded-lg border border-slate-200 bg-white/80 overflow-hidden">
                <Button variant="ghost" size="sm" onClick={() => setViewModeAndStore('list')} className={`rounded-none ${viewMode === 'list' ? 'bg-slate-100' : ''}`} title={t('viewList')}><LayoutList className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => setViewModeAndStore('grid')} className={`rounded-none ${viewMode === 'grid' ? 'bg-slate-100' : ''}`} title={t('viewGrid')}><LayoutGrid className="h-4 w-4" /></Button>
              </div>
              <Button variant="outline" onClick={fetchProducts} disabled={loading} className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {t('refresh')}
              </Button>
              <Button onClick={handleCreateProduct} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {t('addProduct')}
              </Button>
            </>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-blue-500/15 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('totalProducts')}</p>
                  <p className="text-3xl font-bold text-slate-900">{pagination?.total ?? products.length}</p>
                  <p className="text-xs text-slate-500 mt-1">{t('inCatalog')}</p>
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
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('activeProducts')}</p>
                  <p className="text-3xl font-bold text-slate-900">{products.filter(p => p.status === 'active').length}</p>
                  <p className="text-xs text-slate-500 mt-1">{t('onThisPage')}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700">
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
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('featuredProducts')}</p>
                  <p className="text-3xl font-bold text-slate-900">{products.filter(p => p.is_featured).length}</p>
                  <p className="text-xs text-slate-500 mt-1">{t('onThisPage')}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700">
                  <Star className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden border-slate-200/80 bg-white/90 shadow-sm backdrop-blur transition hover:shadow-md">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-violet-500/15 to-transparent" />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">{t('categories')}</p>
                  <p className="text-3xl font-bold text-slate-900">{categories.length}</p>
                  <p className="text-xs text-slate-500 mt-1">{t('total')}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-700">
                  <Package className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end justify-between">
              <div className="flex flex-col lg:flex-row gap-4 flex-1 w-full">
                <div className="flex flex-col flex-1 max-w-md">
                  <label className="text-xs font-medium text-slate-600 mb-1">{t('search')}</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder={t('searchProducts')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/50 border-slate-200 focus:bg-white focus:border-blue-500 transition-all duration-200"
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-slate-600 mb-1">{t('selectCategory')}</label>
                  <Select value={selectedCategory || 'all'} onValueChange={(value) => setSelectedCategory(value === 'all' ? '' : value)}>
                    <SelectTrigger className="min-w-[180px] border-slate-200 bg-white/50 focus:bg-white">
                      <SelectValue placeholder={t('allCategories')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allCategories')}</SelectItem>
                      {categories.map((category: any) => (
                        <SelectItem key={category.category_id} value={String(category.category_id)}>
                          {category.category_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products: List or Grid */}
        {viewMode === 'list' ? (
          loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg animate-pulse">
                  <CardContent className="p-6"><div className="h-4 bg-gray-200 rounded w-1/3" /></CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <p className="text-slate-600">{t('noProductsFound')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => (
                <Card key={product.product_id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-14 w-14 rounded-lg bg-slate-100 shrink-0 overflow-hidden">
                          {product.main_image ? (
                            <img src={product.main_image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-400"><Package className="h-6 w-6" /></div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">{product.product_name}</h3>
                          <p className="text-sm text-slate-500 truncate">{product.description || '—'}</p>
                          <Badge variant="outline" className={`mt-1 ${getStatusColor(product.status || '')}`}>{t(product.status === 'active' ? 'productStatusActive' : product.status === 'inactive' ? 'productStatusInactive' : 'productStatusDraft')}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <p className="font-semibold text-emerald-600">{formatPrice(product.list_price)}</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewProduct(product)} className="bg-white/80 border-slate-200 hover:bg-white"><Eye className="h-4 w-4" /></Button>
                          <Button variant="outline" size="sm" onClick={() => handleEditProduct(product)} className="bg-white/80 border-slate-200 hover:bg-white"><Edit className="h-4 w-4" /></Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteProduct(product.product_id)} className="bg-white/80 border-slate-200 hover:bg-white text-red-600"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          <ProductGrid
            products={filteredProducts}
            loading={loading}
            onEdit={handleEditProduct}
            onDelete={handleDeleteProduct}
            onView={handleViewProduct}
          />
        )}

        {/* Pagination */}
        {!loading && pagination && pagination.last_page > 1 && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mt-4">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-slate-600">
                {t('showingXOfY', { from: String(pagination.from), to: String(pagination.to), total: String(pagination.total) })}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pagination.current_page <= 1} className="bg-white/80 border-slate-200 hover:bg-white">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-slate-700 min-w-[120px] text-center">
                  {t('pageOf', { current: String(pagination.current_page), total: String(pagination.last_page) })}
                </span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))} disabled={pagination.current_page >= pagination.last_page} className="bg-white/80 border-slate-200 hover:bg-white">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Product Modal */}
        <ProductModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          product={editingProduct}
          categories={categories}
          onSaved={handleProductSaved}
        />

        {/* Product Detail Modal */}
        <ProductDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          product={viewingProduct}
          onEdit={handleEditFromDetail}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false)
            setDeletingProductId(null)
          }}
          onConfirm={confirmDeleteProduct}
          title="Delete Product"
          description="Are you sure you want to delete this product? This action cannot be undone and will remove all associated images and variants."
          confirmText="Delete"
          cancelText="Cancel"
        />
      </div>
    </div>
  )
}
