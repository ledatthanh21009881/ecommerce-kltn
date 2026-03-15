'use client'

import { useState, useEffect } from 'react'
import { X, Upload, Plus, Trash2, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Product, ProductFormData, ProductVariant, ProductImage } from '@/lib/types'
import { authUtils } from '@/lib/auth'
import { useLanguage } from '@/contexts/LanguageContext'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  categories: any[]
  onSaved: () => void
}

export default function ProductModal({ isOpen, onClose, product, categories, onSaved }: ProductModalProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ProductFormData>({
    product_name: '',
    category_id: 0,
    short_description: '',
    description: '',
    material: '',
    list_price: 0,
    compare_at_price: 0,
    cost_price: 0,
    stock: 0,
    status: 'active',
    is_featured: false,
    variants: [],
    images: []
  })

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [mainImageIndex, setMainImageIndex] = useState<number>(0)

  // Initialize form data when product changes
  useEffect(() => {
    console.log('ProductModal - Product changed:', product)
    if (product) {
      setFormData({
        product_name: product.product_name,
        category_id: product.category_id,
        short_description: product.short_description || '',
        description: product.description || '',
        material: product.material || '',
        list_price: typeof product.list_price === 'string' ? parseFloat(product.list_price) : product.list_price,
        compare_at_price: product.compare_at_price ? (typeof product.compare_at_price === 'string' ? parseFloat(product.compare_at_price) : product.compare_at_price) : 0,
        cost_price: product.cost_price ? (typeof product.cost_price === 'string' ? parseFloat(product.cost_price) : product.cost_price) : 0,
        stock: product.stock,
        status: product.status,
        is_featured: product.is_featured,
        variants: product.variants || [],
        images: product.images || []
      })
      
             // Set existing images
       console.log('ProductModal - Setting images:', product.images)
       if (product.images && product.images.length > 0) {
         const urls = product.images.map(img => img.image_url || img.url || '').filter(url => url)
         console.log('ProductModal - Image URLs:', urls)
         setImageUrls(urls)
         // Find main image index
         const mainImage = product.images.find(img => Boolean(img.is_main))
         console.log('ProductModal - Main image:', mainImage)
         if (mainImage) {
           const mainIndex = product.images.findIndex(img => (img.image_url || img.url) === (mainImage.image_url || mainImage.url))
           console.log('ProductModal - Main image index:', mainIndex)
           setMainImageIndex(mainIndex >= 0 ? mainIndex : 0)
         }
       }
    } else {
      // Reset form for new product
      setFormData({
        product_name: '',
        category_id: 0,
        short_description: '',
        description: '',
        material: '',
        list_price: 0,
        compare_at_price: 0,
        cost_price: 0,
        stock: 0,
        status: 'active',
        is_featured: false,
        variants: [
          {
            variant_id: 0,
            product_id: 0,
            size_id: 1,
            size_name: 'S',
            sku: '',
            stock_quantity: 0,
            status: 'in_stock',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ],
        images: []
      })
             setSelectedFiles([])
       setImageUrls([])
       setMainImageIndex(0)
    }
  }, [product])

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleVariantChange = (index: number, field: keyof ProductVariant, value: any) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((variant, i) => 
        i === index ? { ...variant, [field]: value } : variant
      )
    }))
  }

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          variant_id: 0,
          product_id: 0,
          size_id: 1,
          size_name: 'S',
          sku: '',
          stock_quantity: 0,
          status: 'in_stock',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    }))
  }

  const removeVariant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files])
    }
  }

  const removeImage = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    // Update mainImageIndex if needed
    if (index === mainImageIndex) {
      setMainImageIndex(0)
    } else if (index < mainImageIndex) {
      setMainImageIndex(prev => prev - 1)
    }
  }

  const removeImageUrl = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index))
    // Update mainImageIndex if needed
    const imageIndex = selectedFiles.length + index
    if (imageIndex === mainImageIndex) {
      setMainImageIndex(0)
    } else if (imageIndex < mainImageIndex) {
      setMainImageIndex(prev => prev - 1)
    }
  }

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.product_name || !formData.category_id) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)

    try {
             // Convert files to base64
               const fileImages: ProductImage[] = await Promise.all(
          selectedFiles
            .filter(file => file && file.size > 0)
            .map(async (file, index) => ({
              image_id: 0,
              product_id: 0,
              file: await convertFileToBase64(file),
              alt_text: `${formData.product_name} - Image ${index + 1}`,
              image_type: 'gallery',
              is_main: false,
              position: index,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }))
        )

        // Add existing image URLs
        const urlImages: ProductImage[] = imageUrls
          .filter(url => url && url.trim() !== '')
          .map((url, index) => ({
            image_id: 0,
            product_id: 0,
            url,
            alt_text: `${formData.product_name} - Image ${index + 1}`,
            image_type: 'gallery',
            is_main: false,
            position: index,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))

       // Combine all images and set main image
       const allImages = [...fileImages, ...urlImages]
       if (allImages.length > 0) {
         // Set main image based on mainImageIndex
         const mainImageIndexInCombined = Math.min(mainImageIndex, allImages.length - 1)
         allImages[mainImageIndexInCombined].image_type = 'thumbnail'
       }

       const submitData = {
         ...formData,
         images: allImages
       }

      const token = authUtils.getAdminToken()
      console.log('🔑 Token for product operation:', token ? 'Token exists' : 'No token found')
      console.log('🔑 Token value:', token)
      console.log('🔑 Token length:', token?.length)
      console.log('🔑 Token starts with:', token?.substring(0, 20) + '...')
      
      // Decode token để xem payload
      if (token) {
        try {
          const parts = token.split('.')
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
            console.log('🔑 Token payload:', payload)
            console.log('🔑 Token expires at:', new Date(payload.exp * 1000))
            console.log('🔑 Current time:', new Date())
            console.log('🔑 Is expired:', payload.exp < Date.now() / 1000)
          }
        } catch (e) {
          console.log('🔑 Error decoding token:', e)
        }
      }
      
      if (!token) {
        toast.error('No authentication token found. Please login again.')
        return
      }
      
      const url = product 
        ? `/api/backend/v1/products/update?id=${product.product_id}`
        : '/api/backend/v1/products'
      
      console.log('🌐 Making request to:', url)
      console.log('📤 Request method:', product ? 'PUT' : 'POST')
      console.log('📋 Request data:', submitData)
      
      const response = await fetch(url, {
        method: product ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      })

      console.log('📥 Response status:', response.status)
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.log('❌ Error response:', errorText)
        
        if (response.status === 401) {
          toast.error('Authentication failed. Please login again.')
          return
        }
        
        toast.error(`Request failed: ${response.status} ${response.statusText}`)
        return
      }

      const result = await response.json()
      console.log('✅ Response data:', result)

      if (result.success) {
        toast.success(product ? 'Product updated successfully!' : 'Product created successfully!')
        onSaved()
      } else {
        toast.error(result.message || 'Failed to save product')
      }
    } catch (error) {
      console.error('❌ Error saving product:', error)
      
      if (error instanceof SyntaxError) {
        toast.error('Invalid response from server. Please try again.')
      } else if (error instanceof TypeError) {
        toast.error('Network error. Please check your connection.')
      } else {
        toast.error(`Error saving product: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-white bg-opacity-80 backdrop-blur-md" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {product ? t('modalEditProduct') : t('modalAddProduct')}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('basicInformation')}</h3>
              
              <div>
                <Label htmlFor="product_name">{t('productName')} *</Label>
                <Input
                  id="product_name"
                  value={formData.product_name}
                  onChange={(e) => handleInputChange('product_name', e.target.value)}
                  placeholder={t('enterProductName')}
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">{t('productCategory')} *</Label>
                <select
                  id="category"
                  value={formData.category_id}
                  onChange={(e) => handleInputChange('category_id', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">{t('selectCategory')}</option>
                  {categories.map((category) => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.category_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="short_description">{t('shortDescription')}</Label>
                <Textarea
                  id="short_description"
                  value={formData.short_description}
                  onChange={(e) => handleInputChange('short_description', e.target.value)}
                  placeholder={t('briefDescription')}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="description">{t('fullDescription')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder={t('detailedDescription')}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="material">{t('productMaterial')}</Label>
                <Input
                  id="material"
                  value={formData.material}
                  onChange={(e) => handleInputChange('material', e.target.value)}
                  placeholder={t('materialPlaceholder')}
                />
              </div>
            </div>

            {/* Pricing & Status */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('pricingAndStatus')}</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="list_price">{t('listPrice')} *</Label>
                  <Input
                    id="list_price"
                    type="number"
                    value={formData.list_price}
                    onChange={(e) => handleInputChange('list_price', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    step="1000"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="compare_at_price">{t('comparePrice')}</Label>
                  <Input
                    id="compare_at_price"
                    type="number"
                    value={formData.compare_at_price}
                    onChange={(e) => handleInputChange('compare_at_price', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    step="1000"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cost_price">{t('costPrice')}</Label>
                <Input
                  id="cost_price"
                  type="number"
                  value={formData.cost_price}
                  onChange={(e) => handleInputChange('cost_price', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                  step="1000"
                />
              </div>

              <div>
                <Label htmlFor="stock">{t('stockQuantity')}</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="status">{t('status')}</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">{t('productStatusActive')}</option>
                  <option value="inactive">{t('productStatusInactive')}</option>
                  <option value="draft">{t('productStatusDraft')}</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => handleInputChange('is_featured', checked)}
                />
                <Label htmlFor="is_featured">{t('featuredProductLabel')}</Label>
              </div>
            </div>
          </div>

          {/* Variants */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">{t('productVariantsTitle')}</h3>
              <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                <Plus className="h-4 w-4 mr-2" />
                {t('addVariant')}
              </Button>
            </div>

            {formData.variants.map((variant, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{t('variantNumber', { n: String(index + 1) })}</h4>
                  {formData.variants.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVariant(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>{t('size')}</Label>
                    <select
                      value={variant.size_id}
                      onChange={(e) => handleVariantChange(index, 'size_id', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={1}>S</option>
                      <option value={2}>M</option>
                      <option value={3}>L</option>
                      <option value={4}>XL</option>
                    </select>
                  </div>
                  <div>
                    <Label>{t('sku')}</Label>
                    <Input
                      value={variant.sku}
                      onChange={(e) => handleVariantChange(index, 'sku', e.target.value)}
                      placeholder={t('skuPlaceholder')}
                    />
                  </div>
                  <div>
                    <Label>{t('productStockLabel')}</Label>
                    <Input
                      type="number"
                      value={variant.stock_quantity}
                      onChange={(e) => handleVariantChange(index, 'stock_quantity', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label>{t('status')}</Label>
                    <select
                      value={variant.status}
                      onChange={(e) => handleVariantChange(index, 'status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="in_stock">{t('inStock')}</option>
                      <option value="out_of_stock">{t('productStatusOutOfStock')}</option>
                      <option value="low_stock">{t('lowStock')}</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Images */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{t('productImagesTitle')}</h3>
            
                         <div className="space-y-4">
               <div>
                 <Label htmlFor="images">{t('uploadImages')}</Label>
                 <Input
                   id="images"
                   type="file"
                   multiple
                   accept="image/*"
                   onChange={handleFileSelect}
                   className="cursor-pointer"
                 />
               </div>
               
               <div>
                 <Label htmlFor="imageUrl">{t('addImageUrl')}</Label>
                 <div className="flex gap-2">
                   <Input
                     id="imageUrl"
                     type="url"
                     placeholder={t('imageUrlPlaceholder')}
                     onKeyPress={(e) => {
                       if (e.key === 'Enter') {
                         e.preventDefault()
                         const input = e.target as HTMLInputElement
                         if (input.value.trim()) {
                           setImageUrls(prev => [...prev, input.value.trim()])
                           input.value = ''
                         }
                       }
                     }}
                   />
                   <Button
                     type="button"
                     variant="outline"
                     onClick={() => {
                       const input = document.getElementById('imageUrl') as HTMLInputElement
                       if (input.value.trim()) {
                         setImageUrls(prev => [...prev, input.value.trim()])
                         input.value = ''
                       }
                     }}
                   >
                     {t('add')}
                   </Button>
                 </div>
               </div>
             </div>

                         {/* All Images Preview */}
             {(selectedFiles.length > 0 || imageUrls.length > 0) && (
               <div className="space-y-4">
                 <Label>{t('imagePreview')}</Label>
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                   {/* Selected Files */}
                   {selectedFiles.map((file, index) => {
                     const imageIndex = index
                     const isMain = imageIndex === mainImageIndex
                     return (
                       <div key={`file-${index}`} className="relative group">
                         <div className={`aspect-square rounded-lg border-2 overflow-hidden ${
                           isMain ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                         }`}>
                           <img
                             src={URL.createObjectURL(file)}
                             alt={file.name}
                             className="w-full h-full object-cover"
                           />
                         </div>
                         <div className="absolute top-2 left-2 flex gap-1">
                           <Button
                             type="button"
                             variant={isMain ? "default" : "secondary"}
                             size="sm"
                             onClick={() => setMainImageIndex(imageIndex)}
                             className="h-6 px-2 text-xs"
                           >
                             {isMain ? t('mainImage') : t('setMain')}
                           </Button>
                           <Button
                             type="button"
                             variant="destructive"
                             size="sm"
                             onClick={() => removeImage(index)}
                             className="h-6 w-6 p-0"
                           >
                             <X className="h-3 w-3" />
                           </Button>
                         </div>
                         <p className="text-xs text-gray-600 mt-1 truncate">{file.name}</p>
                       </div>
                     )
                   })}
                   
                   {/* Image URLs */}
                   {imageUrls.map((url, index) => {
                     const imageIndex = selectedFiles.length + index
                     const isMain = imageIndex === mainImageIndex
                     return (
                       <div key={`url-${index}`} className="relative group">
                         <div className={`aspect-square rounded-lg border-2 overflow-hidden ${
                           isMain ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                         }`}>
                           <img
                             src={url}
                             alt={`Image ${index + 1}`}
                             className="w-full h-full object-cover"
                             onError={(e) => {
                               e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMCAzMEg3MFY3MEgzMFYzMFoiIGZpbGw9IiNEMUQ1REIiLz4KPHBhdGggZD0iTTM1IDM1SDY1VjY1SDM1VjM1WiIgZmlsbD0iI0M3Q0RENyIvPgo8L3N2Zz4K'
                             }}
                           />
                         </div>
                         <div className="absolute top-2 left-2 flex gap-1">
                           <Button
                             type="button"
                             variant={isMain ? "default" : "secondary"}
                             size="sm"
                             onClick={() => setMainImageIndex(imageIndex)}
                             className="h-6 px-2 text-xs"
                           >
                             {isMain ? t('mainImage') : t('setMain')}
                           </Button>
                           <Button
                             type="button"
                             variant="destructive"
                             size="sm"
                             onClick={() => removeImageUrl(index)}
                             className="h-6 w-6 p-0"
                           >
                             <X className="h-3 w-3" />
                           </Button>
                         </div>
                         <p className="text-xs text-gray-600 mt-1 truncate">
                           {url ? url.substring(0, 20) + '...' : 'Invalid URL'}
                         </p>
                       </div>
                     )
                   })}
                 </div>
               </div>
             )}
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
                  {product ? t('updateProduct') : t('createProduct')}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
