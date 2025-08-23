'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Eye, Search, Filter, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import ProductModal from '@/components/admin/ProductModal'
import ProductDetailModal from '@/components/admin/ProductDetailModal'
import ProductGrid from '@/components/admin/ProductGrid'
import ConfirmModal from '@/components/ui/confirm-modal'
import { Product } from '@/lib/types'
import { getAuthData } from '@/lib/admin-auth'

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null)
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null)
  const [categories, setCategories] = useState([])

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true)
      console.log('Fetching products...')
      // Lấy tất cả sản phẩm bằng cách set limit lớn
      const response = await fetch('/api/backend/v1/products?limit=1000')
      console.log('Products response status:', response.status)
      const data = await response.json()
      console.log('Products data:', data)
      
      if (data.success) {
        setProducts(data.data.items || [])
        console.log('Products set:', data.data.items?.length || 0, 'items')
      } else {
        console.error('Failed to fetch products:', data)
        toast.error('Failed to fetch products')
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Error fetching products')
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
    console.log('AdminProductsPage mounted, fetching data...')
    fetchProducts()
    fetchCategories()
  }, [])

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || product.category_id.toString() === selectedCategory
    return matchesSearch && matchesCategory
  })

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Product Management</h1>
          <p className="text-slate-600">Manage your product catalog with ease</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Products</p>
                  <p className="text-2xl font-bold text-slate-900">{products.length}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-xl">📦</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Products</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {products.filter(p => p.status === 'active').length}
                  </p>
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
                  <p className="text-sm font-medium text-slate-600">Featured Products</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {products.filter(p => p.is_featured).length}
                  </p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span className="text-yellow-600 text-xl">⭐</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Categories</p>
                  <p className="text-2xl font-bold text-slate-900">{categories.length}</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 text-xl">🏷️</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="bg-white shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {categories.map((category: any) => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.category_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={fetchProducts}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  onClick={handleCreateProduct}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Product
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
                    <ProductGrid
              products={filteredProducts}
              loading={loading}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
              onView={handleViewProduct}
            />

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
