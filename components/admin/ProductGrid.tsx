'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Edit, Trash2, Eye, MoreHorizontal, Star, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Product } from '@/lib/types'
import { useLanguage } from '@/contexts/LanguageContext'

interface ProductGridProps {
  products: Product[]
  loading: boolean
  onEdit: (product: Product) => void
  onDelete: (productId: number) => void
  onView: (product: Product) => void
}

const STATUS_KEYS: Record<string, string> = {
  active: 'productStatusActive',
  inactive: 'productStatusInactive',
  draft: 'productStatusDraft',
  out_of_stock: 'productStatusOutOfStock',
}

export default function ProductGrid({ products, loading, onEdit, onDelete, onView }: ProductGridProps) {
  const { t } = useLanguage()
  const [hoveredProduct, setHoveredProduct] = useState<number | null>(null)

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(numPrice)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="bg-white shadow-sm animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-48 bg-gray-200 rounded-lg"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <Card className="bg-white shadow-sm">
        <CardContent className="p-12 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noProductsFound')}</h3>
          <p className="text-gray-500">{t('noProductsGetStarted')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <Card 
          key={product.product_id} 
          className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200 group"
          onMouseEnter={() => setHoveredProduct(product.product_id)}
          onMouseLeave={() => setHoveredProduct(null)}
        >
          <CardHeader className="p-0 relative">
            {/* Product Image */}
            <div className="relative h-48 bg-gray-100 rounded-t-lg overflow-hidden">
              {product.main_image ? (
                <Image
                  src={product.main_image}
                  alt={product.product_name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <Package className="h-12 w-12" />
                </div>
              )}
              
              {/* Overlay with actions */}
              {hoveredProduct === product.product_id && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onView(product)}
                    className="bg-white text-gray-900 hover:bg-gray-100"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onEdit(product)}
                    className="bg-white text-gray-900 hover:bg-gray-100"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(product.product_id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Status Badge */}
              <div className="absolute top-2 left-2">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getStatusColor(product.status)}`}
                >
                  {STATUS_KEYS[product.status] ? t(STATUS_KEYS[product.status] as any) : product.status}
                </Badge>
              </div>

              {/* Featured Badge */}
              {product.is_featured && (
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    <Star className="h-3 w-3 mr-1" />
                    {t('productFeatured')}
                  </Badge>
                </div>
              )}

              {/* More Actions */}
              <div className="absolute top-2 right-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(product)}>
                      <Eye className="h-4 w-4 mr-2" />
                      {t('viewDetails')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(product)}>
                      <Edit className="h-4 w-4 mr-2" />
                      {t('edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(product.product_id)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4">
            {/* Product Info */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                {product.product_name}
              </h3>
              
              {product.short_description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {product.short_description}
                </p>
              )}

              {/* Category */}
              {product.category_name && (
                <p className="text-xs text-gray-500">
                  {product.category_name}
                </p>
              )}

              {/* Price */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-green-600">
                  {formatPrice(product.list_price)}
                </span>
                {product.compare_at_price && product.compare_at_price > product.list_price && (
                  <span className="text-sm text-gray-500 line-through">
                    {formatPrice(product.compare_at_price)}
                  </span>
                )}
              </div>

              {/* Stock & Variants */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{t('productStockLabel')}: {product.stock || 0}</span>
                {product.variant_count && product.variant_count > 0 && (
                  <span>{t('productVariantsCount', { count: String(product.variant_count) })}</span>
                )}
              </div>

              {/* Material */}
              {product.material && (
                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full inline-block">
                  {product.material.length > 20 
                    ? `${product.material.substring(0, 20)}...` 
                    : product.material
                  }
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
