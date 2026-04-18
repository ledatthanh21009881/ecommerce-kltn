'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { productApi, Product } from '@/lib/products'
import { ArrowLeft, Edit, Calendar, Package, DollarSign, Tag, Image as ImageIcon, Star } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function ProductDetailsPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [product, setProduct] = useState<Product | null>(null)

  useEffect(() => {
    const productId = params.id as string
    if (productId) {
      loadProduct(productId)
    }
  }, [params.id])

  const loadProduct = async (productId: string) => {
    try {
      setLoading(true)
      const response = await productApi.getProduct(parseInt(productId))
      setProduct(response.data)
    } catch (error: any) {
      console.error('Failed to load product:', error)
      toast({
        title: "Error",
        description: "Failed to load product details",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading product details...</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-lg text-red-600 mb-4">Product not found</div>
        <Button onClick={() => router.push('/admin/products')}>
          Back to Products
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/products')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="admin-page-title">{t('viewProduct')}</h1>
        </div>
        
        <Button
          onClick={() => router.push(`/admin/products/edit/${product.id}`)}
          className="flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
          Edit Product
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Images */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Product Images
            </h2>
            <div>
              {product.images && product.images.length > 0 ? (
                <div className="space-y-4">
                  {product.images.map((image: any, index: number) => (
                    <div key={image.id || index} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={image.is_primary || index === 0 ? "default" : "secondary"}>
                          {image.is_primary || index === 0 ? "Main Image" : `Image #${index + 1}`}
                        </Badge>
                        {product.is_featured && index === 0 && (
                          <Badge variant="outline" className="text-yellow-600">
                            <Star className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                      </div>
                      <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden relative">
                        <Image
                          src={image.image_url || image.url}
                          alt={`${product.product_name} - Image ${index + 1}`}
                          fill
                          className="object-cover"
                          onError={() => console.log('Image failed to load')}
                        />
                      </div>
                      <p className="text-xs text-gray-500 break-all">
                        {image.image_url || image.url}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No images available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product Information */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Product Name</label>
                <p className="text-lg font-semibold">{product.product_name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Slug</label>
                <p className="text-sm text-gray-700 font-mono bg-gray-100 px-2 py-1 rounded">
                  {product.slug || 'N/A'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Category</label>
                <p className="text-sm">{product.category_name || 'N/A'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Material</label>
                <p className="text-sm">{product.material || 'N/A'}</p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-500">Status</label>
                <Badge variant={
                  product.status === 'active' ? 'default' : 
                  product.status === 'inactive' ? 'secondary' : 'destructive'
                }>
                  {product.status || 'active'}
                </Badge>
                {product.is_featured && (
                  <Badge variant="outline" className="text-yellow-600">
                    <Star className="h-3 w-3 mr-1" />
                    Featured
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Pricing & Stock */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing & Stock
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Price</label>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(product.min_price || 0)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Stock</label>
                  <p className="text-xl font-bold flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {product.total_stock || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Descriptions */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Descriptions</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Short Description</label>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                  {product.short_description || 'No short description provided'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Full Description</label>
                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                  {product.description ? (
                    <div className="whitespace-pre-wrap">{product.description}</div>
                  ) : (
                    <p className="italic text-gray-500">No description provided</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Metadata
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Product ID</label>
                <p className="text-sm font-mono">{product.id}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Created At</label>
                <p className="text-sm">{formatDate(product.created_at)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-sm">{formatDate(product.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
