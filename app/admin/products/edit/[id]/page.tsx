'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { productApi, ProductFormData, Product } from '@/lib/products'
import { getCategories, Category } from '@/lib/categories'
import { authUtils } from '@/lib/auth'
import { ArrowLeft, Upload, X, ImageIcon, Save, Eye, CheckCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { violatesVndPriceStep } from '@/lib/vnd-price-step'

interface ImageUpload {
  id: string
  file?: File
  url: string
  is_main: boolean
  position: number
  existing?: boolean
  modified?: boolean // New flag to track if image was modified
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { t } = useLanguage()

  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [images, setImages] = useState<ImageUpload[]>([])
  const [product, setProduct] = useState<Product | null>(null)
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [successMode, setSuccessMode] = useState(false)
  
  const [formData, setFormData] = useState<ProductFormData>({
    product_name: '',
    slug: '',
    description: '',
    short_description: '',
    category_id: 0,
    material: '',
    list_price: 0,
    compare_at_price: 0,
    cost_price: 0,
    price: 0,
    stock_quantity: 0,
    status: 'active' as 'active' | 'inactive' | 'out_of_stock',
    is_featured: false,
    variants: [],
    images: []
  })

  // Load data on mount
  useEffect(() => {
    const user = authUtils.getUser()
    if (!user) {
      toast({
        title: "Access Denied",
        description: "Please login to access this page",
        variant: "destructive"
      })
      router.push('/login')
      return
    }

    const productId = params.id as string
    if (productId) {
      loadProduct(productId)
      loadCategories()
    }
  }, [params.id, router, toast])

  const loadProduct = async (productId: string) => {
    try {
      setPageLoading(true)
      console.log('🔍 Loading product with ID:', productId)
      
      const token = authUtils.getToken()
      if (!token) {
        throw new Error('No authentication token found')
      }

      let productData
      try {
        console.log('🔄 Trying proxy API first for GET...')
        const response = await fetch(`/api/backend/v1/products/${productId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          console.log('❌ Proxy API failed with status:', response.status)
          throw new Error(`Proxy API failed with status: ${response.status}`)
        }

        const result = await response.json()
        console.log('✅ Proxy API success:', result)
        productData = result.data
        
      } catch (proxyError) {
        console.log('🔄 Proxy failed, trying direct API...', proxyError)
        const response = await fetch(`/api/backend/v1/products/${productId}`, {
          mode: 'cors',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Network error' }))
          console.log('❌ Direct API failed:', errorData)
          throw new Error(errorData.message || `HTTP ${response.status}`)
        }

        const result = await response.json()
        console.log('✅ Direct API success:', result)
        productData = result.data
      }

      console.log('📋 Product data loaded:', productData)
      setProduct(productData)
      
      setFormData({
        product_name: productData.product_name || '',
        slug: productData.slug || '',
        description: productData.description || '',
        short_description: productData.short_description || '',
        category_id: productData.category_id || 0,
        material: productData.material || '',
        list_price: productData.list_price || 0,
        compare_at_price: productData.compare_at_price || 0,
        cost_price: productData.cost_price || 0,
        price: productData.list_price || 0,
        stock_quantity: productData.stock_quantity || 0,
        status: productData.status || 'active',
        is_featured: productData.is_featured || false,
        variants: [],
        images: []
      })

      if (productData.images && productData.images.length > 0) {
        const existingImages = productData.images.map((img: any, index: number) => ({
          id: img.image_id?.toString() || img.id?.toString() || `existing-${index}`,
          url: img.image_url || img.url,
          is_main: img.is_main || index === 0,
          position: img.position || index + 1,
          existing: true
        }))
        setImages(existingImages)
      }
      
    } catch (error: any) {
      console.error('Failed to load product:', error)
      toast({
        title: "❌ Error",
        description: error.message || "Failed to load product data",
        variant: "destructive"
      })
      router.push('/admin/products')
    } finally {
      setPageLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const data = await getCategories()
      setCategories(data || [])
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      product_name: name,
      slug: prev.slug || generateSlug(name)
    }))
  }

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!product) return
    
    if (!formData.product_name || !formData.category_id) {
      toast({
        title: "Validation Error",
        description: "Product name and category are required",
        variant: "destructive"
      })
      return
    }

    if (
      violatesVndPriceStep(formData.list_price) ||
      violatesVndPriceStep(formData.compare_at_price) ||
      violatesVndPriceStep(formData.cost_price)
    ) {
      toast({
        title: t('invalidPrice'),
        description: t('priceStepMismatch'),
        variant: 'destructive',
      })
      return
    }
    
    try {
      setLoading(true)

      const updateData = {
        product_name: formData.product_name,
        category_id: formData.category_id,
        short_description: formData.short_description || '',
        description: formData.description || '',
        list_price: Number(formData.list_price) || 0,
        compare_at_price: Number(formData.compare_at_price) || 0,
        cost_price: Number(formData.cost_price) || 0,
        material: formData.material || '',
        status: formData.status || 'active',
        is_featured: Boolean(formData.is_featured)
      }

      const token = authUtils.getToken()
      if (!token) {
        throw new Error('Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại.')
      }

      console.log('📤 Updating product with data:', updateData)
      const productId = product.product_id
      console.log('🎯 Product ID for update:', productId)

      let result
      try {
        console.log('🔄 Trying proxy API for PUT...')
        const response = await fetch(`/api/backend/v1/products/${productId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        })

        if (!response.ok) {
          console.log('❌ Proxy PUT failed with status:', response.status)
          throw new Error(`Proxy API failed with status: ${response.status}`)
        }

        result = await response.json()
        console.log('✅ Proxy PUT success:', result)
        
      } catch (proxyError) {
        console.log('🔄 Proxy failed, trying direct PUT API...', proxyError)
        const response = await fetch(`/api/backend/v1/products/${productId}`, {
          method: 'PUT',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Network error' }))
          console.log('❌ Direct PUT failed:', errorData)
          throw new Error(errorData.message || `HTTP ${response.status}`)
        }

        result = await response.json()
        console.log('✅ Direct PUT success:', result)
      }

      console.log('📋 Update result:', result)

      // Check for authentication errors
      if (!result.success && result.status_code === 401) {
        console.log('🔐 Token expired, redirecting to login...')
        authUtils.removeToken()
        toast({
          title: "🔐 Session Expired",
          description: "Please login again to continue",
          variant: "destructive"
        })
        router.push('/login')
        return
      }

      // Check for other API errors
      if (!result.success && result.message) {
        throw new Error(result.message)
      }

      await handleImageUpdates()

      // Success animation and feedback
      setSuccessMode(true)
      setLoading(false)
      
      toast({
        title: "🎉 Cập nhật thành công!",
        description: `Sản phẩm "${formData.product_name}" đã được cập nhật thành công với tất cả thông tin và hình ảnh mới`,
        variant: "default",
        duration: 3000
      })
      
      // Show success state briefly before redirect
      setTimeout(() => {
        toast({
          title: "🚀 Đang chuyển hướng...",
          description: "Quay về danh sách sản phẩm",
          variant: "default",
          duration: 1000
        })
        
        setTimeout(() => {
          router.push('/admin/products')
        }, 500)
      }, 1500)
      
    } catch (error: any) {
      console.error('Failed to update product:', error)
      toast({
        title: "❌ Lỗi",
        description: error.message || "Không thể cập nhật sản phẩm",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpdates = async () => {
    const token = authUtils.getToken()
    if (!token) return

    console.log('📸 Starting image updates...')
    const productId = product?.product_id
    
    // Update existing images that were modified
    const imagesToUpdate = images.filter(img => img.existing && (img.modified || img.file))
    
    for (const img of imagesToUpdate) {
      try {
        console.log('🔄 Updating existing image:', img.id, 'URL:', img.url)
        const updateImageData = {
          url: img.url,
          position: img.position,
          image_type: "detail"
        }

        try {
          const response = await fetch(`/api/backend/v1/product-images/${img.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(updateImageData),
          })

          if (!response.ok) {
            console.log('❌ Proxy image update failed with status:', response.status)
            throw new Error(`Proxy failed`)
          }
          
          const result = await response.json()
          console.log('✅ Image updated via proxy:', img.id, result)
          
        } catch (proxyError) {
          console.log('🔄 Proxy failed, trying direct API for image update...')
          const response = await fetch(`/api/backend/v1/product-images/${img.id}`, {
            method: 'PUT',
            mode: 'cors',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(updateImageData),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Network error' }))
            console.log('❌ Direct image update failed:', errorData)
            throw new Error(errorData.message || `HTTP ${response.status}`)
          }
          
          const result = await response.json()
          console.log('✅ Image updated via direct API:', img.id, result)
        }
      } catch (error) {
        console.error(`Failed to update image ${img.id}:`, error)
        toast({
          title: "⚠️ Warning",
          description: `Failed to update image ${img.id}`,
          variant: "destructive"
        })
      }
    }

    // Add new images (not existing)
    const newImages = images.filter(img => !img.existing && img.url && img.url.trim() !== '')
    
    if (newImages.length > 0 && productId) {
      try {
        console.log('📤 Adding new images:', newImages.length)
        const imageData = newImages.map((img, index) => ({
          url: img.url,
          position: img.position || index + 1,
          is_main: img.is_main,
          image_type: "product"
        }))

        try {
          const response = await fetch(`/api/backend/v1/products/${productId}/images`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              images: imageData
            })
          })

          if (!response.ok) {
            console.log('❌ Proxy new images failed with status:', response.status)
            throw new Error(`Proxy failed`)
          }
          
          console.log('✅ New images added via proxy')
          
        } catch (proxyError) {
          console.log('🔄 Proxy failed, trying direct API for new images...')
          const response = await fetch(`/api/backend/v1/products/${productId}/images`, {
            method: 'POST',
            mode: 'cors',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              images: imageData
            })
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Network error' }))
            console.log('❌ Direct new images failed:', errorData)
            throw new Error(errorData.message || `HTTP ${response.status}`)
          }
          
          console.log('✅ New images added via direct API')
        }
      } catch (error) {
        console.error('Failed to add new images:', error)
        toast({
          title: "⚠️ Warning", 
          description: "Failed to add some new images",
          variant: "destructive"
        })
      }
    }
    
    console.log('📸 Image updates completed')
  }

  const handleFileUpload = (imageId: string, file: File) => {
    const url = URL.createObjectURL(file)
    console.log('📁 File uploaded for image:', imageId, 'URL:', url)
    
    setImages(images.map(img => 
      img.id === imageId 
        ? { ...img, file, url, existing: false }
        : img
    ))
  }

  const handleUrlChange = (imageId: string, newUrl: string) => {
    console.log('🔄 URL changed for image:', imageId, 'New URL:', newUrl)
    
    setImages(prevImages => prevImages.map(img => 
      img.id === imageId 
        ? { 
            ...img, 
            url: newUrl,
            modified: true, // Mark as modified but keep existing status
            file: undefined // Clear file when URL is set
          }
        : img
    ))
    
    // Force re-render with a slight delay to ensure state update
    setTimeout(() => {
      console.log('✅ Image URL updated successfully')
    }, 100)
  }

  const addNewImage = () => {
    const newImage: ImageUpload = {
      id: Date.now().toString(),
      url: '',
      is_main: images.length === 0,
      position: images.length + 1,
      existing: false
    }
    setImages([...images, newImage])
  }

  const setMainImage = (id: string) => {
    setImages(images.map(img => ({
      ...img,
      is_main: img.id === id
    })))
  }

  const removeImage = async (id: string) => {
    const imageToRemove = images.find(img => img.id === id)
    
    if (imageToRemove?.existing && product) {
      try {
        await productApi.deleteProductImage(product.product_id, parseInt(id, 10))
        toast({
          title: "Image Deleted",
          description: "Image removed successfully",
          variant: "default"
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete image from server",
          variant: "destructive"
        })
        return
      }
    }

    const filteredImages = images.filter(img => img.id !== id)
    const updatedImages = filteredImages.map((img, index) => ({
      ...img,
      position: index + 1,
      is_main: index === 0 && filteredImages.length > 0 ? true : (img.is_main && index !== 0 ? false : img.is_main)
    }))
    setImages(updatedImages)
  }

  if (pageLoading) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading product data...</div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-[#1a2b56] mb-4">Product Not Found</h1>
          <Button onClick={() => router.push('/admin/products')}>
            Back to Products
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl relative">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="admin-page-title">
          {t('modalEditProduct')}: {product.product_name}
        </h1>
      </div>

      <form noValidate onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6 overflow-visible">
            <div className="bg-white p-6 rounded-lg border border-gray-200 relative z-10">
              <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="product_name">Product Name *</Label>
                  <Input
                    id="product_name"
                    value={formData.product_name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Enter product name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="product-slug"
                  />
                </div>

                <div className="relative">
                  <Label>Category *</Label>
                  <div 
                    className="relative cursor-pointer"
                    onClick={() => {
                      setCategoryDropdownOpen(!categoryDropdownOpen)
                      setStatusDropdownOpen(false)
                    }}
                  >
                    <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 justify-between items-center">
                      <span>
                        {formData.category_id 
                          ? categories.find(cat => cat.category_id === formData.category_id)?.category_name || 'Select category...'
                          : 'Select category...'
                        }
                      </span>
                      <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  
                  {categoryDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setCategoryDropdownOpen(false)}
                      />
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md">
                        {categories.map((category) => (
                          <div
                            key={category.category_id}
                            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, category_id: category.category_id }))
                              setCategoryDropdownOpen(false)
                            }}
                          >
                            {category.category_name}
                            {formData.category_id === category.category_id && (
                              <svg className="ml-auto h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <Label htmlFor="material">Material</Label>
                  <Input
                    id="material"
                    value={formData.material}
                    onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
                    placeholder="e.g., Cotton, Polyester, Denim"
                  />
                </div>

                <div>
                  <Label htmlFor="short_description">Short Description</Label>
                  <Textarea
                    id="short_description"
                    value={formData.short_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
                    placeholder="Brief product description..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Full Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed product description..."
                    rows={6}
                  />
                </div>
              </div>
            </div>

            {/* Pricing & Stock */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 relative z-10">
              <h2 className="text-xl font-semibold mb-4">Pricing & Stock</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="list_price">List Price (VND) *</Label>
                  <div className="relative">
                    <Input
                      id="list_price"
                      type="number"
                      value={formData.list_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, list_price: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                      min="0"
                      step="1000"
                      className="pr-12"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      VND
                    </span>
                  </div>
                  {formData.list_price && formData.list_price > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      ≈ {new Intl.NumberFormat('vi-VN').format(formData.list_price)} VND
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="compare_at_price">Compare At Price (VND)</Label>
                  <div className="relative">
                    <Input
                      id="compare_at_price"
                      type="number"
                      value={formData.compare_at_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, compare_at_price: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                      min="0"
                      step="1000"
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      VND
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Price before discount (optional)
                  </p>
                </div>

                <div>
                  <Label htmlFor="cost_price">Cost Price (VND)</Label>
                  <div className="relative">
                    <Input
                      id="cost_price"
                      type="number"
                      value={formData.cost_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, cost_price: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                      min="0"
                      step="1000"
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      VND
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Internal cost (for profit calculation)
                  </p>
                </div>

                <div>
                  <Label htmlFor="stock_quantity">Stock Quantity</Label>
                  <div className="relative">
                    <Input
                      id="stock_quantity"
                      type="number"
                      value={formData.stock_quantity}
                      readOnly
                      disabled
                      placeholder="0"
                      min="0"
                      step="1"
                      className="pr-12 bg-slate-50 text-slate-600 cursor-not-allowed"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      pcs
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{t('stockIncreaseViaPurchaseReceipt')}</p>
                </div>
              </div>

              {/* Profit Calculation Display */}
              {formData.list_price && formData.cost_price && formData.list_price > 0 && formData.cost_price > 0 && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium mb-2">Profit Analysis</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Profit:</span>
                      <span className="ml-2 font-medium text-green-600">
                        {new Intl.NumberFormat('vi-VN').format(formData.list_price - formData.cost_price)} VND
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Margin:</span>
                      <span className="ml-2 font-medium text-blue-600">
                        {((formData.list_price - formData.cost_price) / formData.list_price * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Markup:</span>
                      <span className="ml-2 font-medium text-purple-600">
                        {((formData.list_price - formData.cost_price) / formData.cost_price * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 relative z-10">
              <h2 className="text-xl font-semibold mb-4">Product Settings</h2>
              
              <div className="space-y-4">
                <div className="relative">
                  <Label>Status</Label>
                  <div 
                    className="relative cursor-pointer"
                    onClick={() => {
                      setStatusDropdownOpen(!statusDropdownOpen)
                      setCategoryDropdownOpen(false)
                    }}
                  >
                    <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 justify-between items-center">
                      <span className="capitalize">{formData.status}</span>
                      <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  
                  {statusDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setStatusDropdownOpen(false)}
                      />
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md">
                        {[
                          { value: 'active', label: 'Active' },
                          { value: 'inactive', label: 'Inactive' },
                          { value: 'out_of_stock', label: 'Out of Stock' }
                        ].map((status) => (
                          <div
                            key={status.value}
                            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, status: status.value as any }))
                              setStatusDropdownOpen(false)
                            }}
                          >
                            {status.label}
                            {formData.status === status.value && (
                              <svg className="ml-auto h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_featured"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="is_featured">Featured Product</Label>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Product Images</h2>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addNewImage}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Add Image
                </Button>
              </div>
              
              <div className="space-y-4">
                {images.map((image, index) => (
                  <div key={image.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Image {index + 1}</span>
                        {image.is_main && (
                          <Badge variant="secondary" className="text-xs">Main</Badge>
                        )}
                        {image.existing && (
                          <Badge variant="outline" className="text-xs">Existing</Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {!image.is_main && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setMainImage(image.id)}
                          >
                            Set as Main
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeImage(image.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {image.url ? (
                      <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          key={`${image.id}-${image.url}`} // Force re-render when URL changes
                          src={image.url}
                          alt={`Product image ${index + 1}`}
                          fill
                          className="object-cover"
                          unoptimized={true} // Disable caching for immediate update
                          onError={(e) => {
                            console.log('Image load error:', image.url)
                            // Handle broken images
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg">
                        <div className="text-center">
                          <ImageIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">No image selected</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleFileUpload(image.id, file)
                          }
                        }}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                    
                    <div className="mt-2">
                      <Label htmlFor={`url_${image.id}`}>Image URL</Label>
                      <Input
                        id={`url_${image.id}`}
                        value={image.url}
                        onChange={(e) => handleUrlChange(image.id, e.target.value)}
                        placeholder="Enter image URL or upload file"
                        className="font-mono text-sm"
                      />
                      {image.url && (
                        <p className="text-xs text-gray-500 mt-1">
                          Press Enter or click outside to preview new image
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {images.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No images added yet. Click "Add Image" to get started.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || successMode}
            className={`flex items-center gap-2 transition-all duration-300 ${
              successMode 
                ? 'bg-green-600 hover:bg-green-700 scale-105' 
                : ''
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Updating...
              </>
            ) : successMode ? (
              <>
                <div className="flex items-center gap-2 animate-pulse">
                  <span className="text-lg">🎉</span>
                  Success!
                </div>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Update Product
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
