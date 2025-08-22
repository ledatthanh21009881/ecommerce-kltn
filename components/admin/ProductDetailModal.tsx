'use client'

import { X, Star, Package, Tag, DollarSign, Users, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Product } from '@/lib/types'

interface ProductDetailModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  onEdit: () => void
}

export default function ProductDetailModal({ isOpen, onClose, product, onEdit }: ProductDetailModalProps) {
  if (!isOpen || !product) return null

  // Debug logs
  console.log('ProductDetailModal - Product:', product)
  console.log('ProductDetailModal - Images:', product.images)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price)
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

  const getMainImage = () => {
    if (!product.images || product.images.length === 0) {
      return '/placeholder-product.jpg'
    }
    const mainImage = product.images.find(img => img.is_main === 1 || img.is_main === true)
    return mainImage?.image_url || mainImage?.url || product.images[0].image_url || product.images[0].url || '/placeholder-product.jpg'
  }

  const getGalleryImages = () => {
    if (!product.images || product.images.length === 0) return []
    return product.images.filter(img => !(img.is_main === 1 || img.is_main === true))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-white bg-opacity-80 backdrop-blur-md" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Product Details</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              Edit Product
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Images Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Product Images</h3>
              
              {/* Main Image */}
              <div className="aspect-square rounded-lg border overflow-hidden">
                <img
                  src={getMainImage()}
                  alt={product.product_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMCAzMEg3MFY3MEgzMFYzMFoiIGZpbGw9IiNEMUQ1REIiLz4KPHBhdGggZD0iTTM1IDM1SDY1VjY1SDM1VjM1WiIgZmlsbD0iI0M3Q0RENyIvPgo8L3N2Zz4K'
                  }}
                />
              </div>
              
              {/* Gallery Images */}
              {getGalleryImages().length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Gallery Images</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {getGalleryImages().map((image, index) => (
                      <div key={index} className="aspect-square rounded border overflow-hidden">
                        <img
                          src={image.image_url || image.url}
                          alt={`${product.product_name} - Gallery ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMCAzMEg3MFY3MEgzMFYzMFoiIGZpbGw9IiNEMUQ1REIiLz4KPHBhdGggZD0iTTM1IDM1SDY1VjY1SDM1VjM1WiIgZmlsbD0iI0M3Q0RENyIvPgo8L3N2Zz4K'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <h1 className="text-2xl font-bold">{product.product_name}</h1>
                  <div className="flex gap-2">
                    {product.is_featured && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        Featured
                      </Badge>
                    )}
                    <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                      {product.status}
                    </Badge>
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-2xl font-bold text-green-600">
                      {formatPrice(product.list_price)}
                    </span>
                  </div>
                  {product.compare_at_price && product.compare_at_price > product.list_price && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg text-gray-500 line-through">
                        {formatPrice(product.compare_at_price)}
                      </span>
                      <Badge variant="destructive">
                        {Math.round(((product.compare_at_price - product.list_price) / product.compare_at_price) * 100)}% OFF
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Package className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Stock</p>
                      <p className="font-semibold">{product.stock}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Tag className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-600">Variants</p>
                      <p className="font-semibold">{product.variants?.length || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Description</h3>
                {product.short_description && (
                  <p className="text-gray-600">{product.short_description}</p>
                )}
                {product.description && (
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700">{product.description}</p>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Product Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {product.material && (
                    <div>
                      <p className="text-sm text-gray-600">Material</p>
                      <p className="font-medium">{product.material}</p>
                    </div>
                  )}
                  {product.cost_price && (
                    <div>
                      <p className="text-sm text-gray-600">Cost Price</p>
                      <p className="font-medium">{formatPrice(product.cost_price)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Category ID</p>
                    <p className="font-medium">{product.category_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Product ID</p>
                    <p className="font-medium">{product.product_id}</p>
                  </div>
                </div>
              </div>

              {/* Variants */}
              {product.variants && product.variants.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Variants</h3>
                  <div className="space-y-2">
                    {product.variants.map((variant, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">Size {variant.size_name || variant.size_id}</Badge>
                          {variant.sku && <span className="text-sm text-gray-600">{variant.sku}</span>}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm">Stock: {variant.stock_quantity}</span>
                          <Badge variant={variant.status === 'in_stock' ? 'default' : 'secondary'}>
                            {variant.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Created: {formatDate(product.created_at)}</span>
                </div>
                {product.updated_at && product.updated_at !== product.created_at && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Updated: {formatDate(product.updated_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
