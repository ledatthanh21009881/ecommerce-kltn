'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Textarea } from '../../../../components/ui/textarea'
import { Label } from '../../../../components/ui/label'
import { Badge } from '../../../../components/ui/badge'
import { useToast } from '../../../../hooks/use-toast'
import { ProductFormData } from '../../../../lib/products'
import { getCategories, Category } from '../../../../lib/categories'
import { authUtils } from '../../../../lib/auth'
import { ArrowLeft, Upload, X, ImageIcon, Save } from 'lucide-react'

interface ImageUpload {
  id: string
  file?: File
  url: string
  is_main: boolean
  position: number
}

export default function AddProductPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [images, setImages] = useState<ImageUpload[]>([])
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [imageCounter, setImageCounter] = useState(0) // For stable ID generation
  const [isMounted, setIsMounted] = useState(false) // Prevent hydration mismatch
  
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
    status: 'active',
    is_featured: false,
    variants: [],
    images: []
  })

  // Auth check
  useEffect(() => {
    setIsMounted(true) // Prevent hydration mismatch
    
    const token = authUtils.getToken()
    if (!token) {
      router.push('/login')
      return
    }
    loadCategories()
  }, [router])

  const loadCategories = async () => {
    try {
      const data = await getCategories()
      setCategories(data || [])
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
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

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      product_name: name,
      slug: prev.slug || generateSlug(name)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🚀 Form submission started!')
    console.log('📝 Form data:', formData)
    
    if (!formData.product_name || !formData.category_id) {
      toast({
        title: "❌ Validation Error",
        description: "Product name and category are required",
        variant: "destructive"
      })
      return
    }
    
    try {
      setLoading(true)
      console.log('⏳ Setting loading to true...')
      
      const productData = {
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
        throw new Error('No authentication token found')
      }

      console.log('🔑 Token found, sending request...')
      console.log('📤 Product data to send:', productData)

      let result
      try {
        console.log('🔄 Trying proxy API first...')
        const response = await fetch('/api/backend/v1/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(productData),
        })

        if (!response.ok) {
          console.log('❌ Proxy API failed with status:', response.status)
          
          // Check if it's 401 Unauthorized
          if (response.status === 401) {
            const errorData = await response.json().catch(() => ({}))
            if (errorData.status_code === 401) {
              console.log('🔐 Token expired via proxy, redirecting to login...')
              authUtils.removeToken()
              toast({
                title: "🔐 Session Expired",
                description: "Please login again to continue",
                variant: "destructive"
              })
              router.push('/login')
              return
            }
          }
          
          throw new Error(`API failed with status: ${response.status}`)
        }

        result = await response.json()
        console.log('✅ Proxy API success:', result)
        
      } catch (proxyError) {
        console.log('🔄 Proxy failed, trying direct API...', proxyError)
        const response = await fetch('http://localhost:8000/api/v1/products', {
          method: 'POST',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(productData),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Network error' }))
          console.log('❌ Direct API failed:', errorData)
          
          // Check if it's 401 Unauthorized
          if (response.status === 401 || errorData.status_code === 401) {
            console.log('🔐 Token expired via direct API, redirecting to login...')
            authUtils.removeToken()
            toast({
              title: "🔐 Session Expired", 
              description: "Please login again to continue",
              variant: "destructive"
            })
            router.push('/login')
            return
          }
          
          throw new Error(errorData.message || `HTTP ${response.status}`)
        }

        result = await response.json()
        console.log('✅ Direct API success:', result)
      }

      console.log('📋 Full API response:', result)

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
      if (!result.success) {
        throw new Error(result.message || 'API request failed')
      }

      let productId: number
      // Handle API response format from your screenshots
      if (result.data && result.data.product_id) {
        productId = result.data.product_id
        console.log('✅ Product ID extracted from result.data.product_id:', productId)
      } else if (result.data && result.data.id) {
        productId = result.data.id
        console.log('✅ Product ID extracted from result.data.id:', productId)
      } else if (result.product_id) {
        productId = result.product_id
        console.log('✅ Product ID extracted from result.product_id:', productId)
      } else if (result.id) {
        productId = result.id
        console.log('✅ Product ID extracted from result.id:', productId)
      } else {
        console.error('❌ Could not find product ID in response:', result)
        console.log('Available keys in result:', Object.keys(result))
        if (result.data) {
          console.log('Available keys in result.data:', Object.keys(result.data))
        }
        throw new Error('Could not extract product ID from server response')
      }

      console.log('🎯 Final product ID:', productId)

      // Product created successfully - show immediate success
      toast({
        title: "✅ Product Created!",
        description: `Product "${formData.product_name}" created successfully with ID: ${productId}`,
        variant: "default"
      })

      // Handle images if any
      if (images.length > 0) {
        console.log('📸 Processing images...', images.length)
        const validImages = images.filter(img => img.url && img.url.trim() !== '')
        
        if (validImages.length > 0) {
          console.log('📸 Valid images to upload:', validImages.length)
          
          const imageData = validImages.map((img, index) => ({
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
              body: JSON.stringify({ images: imageData })
            })

            if (!response.ok) {
              throw new Error(`Image upload failed`)
            }
            
          } catch (proxyError) {
            await fetch(`http://localhost:8000/api/v1/products/${productId}/images`, {
              method: 'POST',
              mode: 'cors',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ images: imageData })
            })
          }
        }
      }

      // Navigate to products list after success
      router.push('/admin/products')
      
    } catch (error: any) {
      console.error('Failed to create product:', error)
      toast({
        title: "❌ Error",
        description: error.message || "Failed to create product",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const addNewImage = () => {
    const newCounter = imageCounter + 1
    setImageCounter(newCounter)
    
    const newImage: ImageUpload = {
      id: `image-${newCounter}`, // Stable ID generation
      url: '',
      is_main: images.length === 0,
      position: images.length + 1
    }
    setImages([...images, newImage])
  }

  const handleFileUpload = (imageId: string, file: File) => {
    const url = URL.createObjectURL(file)
    setImages(images.map(img => 
      img.id === imageId ? { ...img, file, url } : img
    ))
  }

  const setMainImage = (id: string) => {
    setImages(images.map(img => ({
      ...img,
      is_main: img.id === id
    })))
  }

  const removeImage = (id: string) => {
    const filteredImages = images.filter(img => img.id !== id)
    const updatedImages = filteredImages.map((img, index) => ({
      ...img,
      position: index + 1,
      is_main: index === 0 && filteredImages.length > 0 ? true : (img.is_main && index !== 0 ? false : img.is_main)
    }))
    setImages(updatedImages)
  }

  // Prevent hydration mismatch
  if (!isMounted) {
    return <div className="container mx-auto py-6 max-w-4xl">
      <div className="text-center">Loading...</div>
    </div>
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Add New Product</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border">
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
                    <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm justify-between items-center">
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
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-white shadow-md">
                        {categories.map((category) => (
                          <div
                            key={category.category_id}
                            className="relative flex cursor-pointer select-none items-center px-2 py-1.5 text-sm hover:bg-gray-100"
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
                    placeholder="e.g., Cotton, Polyester"
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

            <div className="bg-white p-6 rounded-lg border">
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
                  <Label htmlFor="stock_quantity">Stock Quantity *</Label>
                  <div className="relative">
                    <Input
                      id="stock_quantity"
                      type="number"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="pr-12"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      pcs
                    </span>
                  </div>
                </div>
              </div>

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

            <div className="bg-white p-6 rounded-lg border">
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
                    <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm justify-between items-center">
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
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-white shadow-md">
                        {[
                          { value: 'active', label: 'Active' },
                          { value: 'inactive', label: 'Inactive' },
                          { value: 'out_of_stock', label: 'Out of Stock' }
                        ].map((status) => (
                          <div
                            key={status.value}
                            className="relative flex cursor-pointer select-none items-center px-2 py-1.5 text-sm hover:bg-gray-100"
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
            <div className="bg-white p-6 rounded-lg border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Product Images</h2>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addNewImage}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Add Image
                </Button>
              </div>
              
              <div className="space-y-4">
                {images.map((image, index) => (
                  <div key={image.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Image {index + 1}</span>
                        {image.is_main && (
                          <Badge variant="secondary" className="text-xs">Main</Badge>
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
                          src={image.url}
                          alt={`Product image ${index + 1}`}
                          fill
                          className="object-cover"
                          unoptimized
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
                        onChange={(e) => setImages(images.map(img => 
                          img.id === image.id 
                            ? { ...img, url: e.target.value }
                            : img
                        ))}
                        placeholder="Enter image URL or upload file"
                      />
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
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading}
            onClick={() => console.log('🖱️ Create Product button clicked!')}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Product
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
