"use client"

import { useState, useEffect, use } from "react"
import Image from "next/image"
import Link from "next/link"
import { Minus, Plus, ChevronDown } from "lucide-react"
import { getProductById, type Product } from "@/lib/products"
import { toast } from "sonner"

// Helper function to format price
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price) + ' ₫'
}

// Helper function to get product images
const getProductImages = (product: Product): string[] => {
  const images: string[] = []
  
  // Add main image first
  if (product.main_image) {
    images.push(product.main_image)
  }
  
  // Add other images (limit to 4 for gallery)
  if (product.images && product.images.length > 0) {
    product.images.slice(0, 3).forEach(img => {
      if (img.url && !images.includes(img.url)) {
        images.push(img.url)
      }
    })
  }
  
  // If no images, add placeholder
  if (images.length === 0) {
    images.push("/placeholder.svg?height=800&width=600")
  }
  
  return images
}

// Helper function to get product price
const getProductPrice = (product: Product): { price: string; originalPrice?: string } => {
  const listPrice = parseFloat(product.list_price || '0')
  const comparePrice = parseFloat(product.compare_at_price || '0')
  
  if (comparePrice > 0 && comparePrice > listPrice) {
    return {
      price: formatPrice(listPrice),
      originalPrice: formatPrice(comparePrice)
    }
  }
  
  return {
    price: formatPrice(listPrice)
  }
}

// Helper function to get available sizes
const getAvailableSizes = (product: Product): string[] => {
  if (product.variants && product.variants.length > 0) {
    return product.variants
      .filter(v => v.is_active === 1 && v.stock_quantity > 0)
      .map(v => v.size_name || '')
      .filter(size => size)
  }
  return []
}

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSize, setSelectedSize] = useState<string>("")
  const [quantity, setQuantity] = useState(1)

  // Unwrap params
  const resolvedParams = use(params)

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true)
        const productId = parseInt(resolvedParams.id)
        const productData = await getProductById(productId)
        setProduct(productData)
        
        // Set default size to "S" if available
        if (productData.variants && productData.variants.length > 0) {
          const availableSizes = productData.variants
            .filter(v => v.is_active === 1 && v.stock_quantity > 0)
            .map(v => v.size_name || '')
            .filter(size => size)
          
          // Try to find "S" first, otherwise use first available size
          const defaultSize = availableSizes.find(size => size.toUpperCase() === 'S') || availableSizes[0] || ''
          if (defaultSize) {
            setSelectedSize(defaultSize)
          }
        }
      } catch (error) {
        console.error("Error fetching product:", error)
        toast.error("Failed to load product")
      } finally {
        setLoading(false)
      }
    }

    if (resolvedParams.id) {
      fetchProduct()
    }
  }, [resolvedParams.id])

  // Loading state
  if (loading) {
    return (
      <div className="p-8">
        <div className="grid gap-16 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-4">
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-200 animate-pulse"></div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (!product) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Product not found</h1>
          <Link href="/all-products" className="text-blue-600 hover:underline">
            Back to products
          </Link>
        </div>
      </div>
    )
  }

  const productImages = getProductImages(product)
  const productPrice = getProductPrice(product)
  const availableSizes = getAvailableSizes(product)

  return (
    <main className="pt-8">
      <div className="p-8 max-w-[85%] ml-[224px] mr-8">
        <div className="grid gap-16 lg:grid-cols-5" style={{ minHeight: '100vh', alignContent: 'start', position: 'relative' }}>
        {/* Product Images */}
        <div className="lg:col-span-3 space-y-6">
          {/* Main Image */}
          <div className="relative aspect-[3/4] w-full overflow-hidden">
            <Image
              src={productImages[0]}
              alt={product.product_name}
              fill
              className="object-cover"
              priority
            />
          </div>
          
          {/* Additional Images - Same size as main */}
          {productImages.length > 1 && (
            <div className="space-y-6">
              {productImages.slice(1, 4).map((image, index) => (
                <div key={index} className="relative aspect-[3/4] w-full overflow-hidden">
                  <Image
                    src={image}
                    alt={`${product.product_name} - View ${index + 2}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="lg:col-span-2" style={{ position: 'sticky', top: '2rem', height: 'fit-content' }}>
          <div className="space-y-6">
            <div>
              <h1 className="font-sans text-base font-bold uppercase tracking-wider md:text-lg lg:text-xl leading-tight text-gray-800">
                {product.product_name}
              </h1>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-lg font-bold text-gray-800">{productPrice.price}</p>
                {productPrice.originalPrice && (
                  <p className="text-base text-gray-400 line-through">{productPrice.originalPrice}</p>
                )}
              </div>
            </div>

            <p className="text-gray-600 text-sm leading-relaxed font-sans">
              {product.description || product.short_description}
            </p>

            {/* Size Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Kích thước</h3>
                <div className="flex gap-3">
                  {availableSizes.length > 0 ? (
                    availableSizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`text-xs font-normal text-gray-600 transition-colors ${
                          selectedSize === size 
                            ? 'border-b border-gray-800 text-gray-800' 
                            : 'hover:text-gray-800'
                        }`}
                      >
                        {size}
                      </button>
                    ))
                  ) : (
                    <p className="text-gray-500 text-xs">No sizes available</p>
                  )}
                </div>
              </div>
              <Link href="/size-guide" className="mt-1 inline-block text-xs underline underline-offset-4">
                Size Guide
              </Link>
            </div>

            {/* Quantity */}
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-800">Số lượng</h3>
              <div className="flex items-center space-x-4">
                <button 
                  className="group relative flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white transition-all duration-300 hover:border-gray-400 hover:shadow-sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="h-2 w-2 text-gray-500 transition-colors group-hover:text-gray-700" />
                  <div className="absolute inset-0 rounded-full bg-gray-50 opacity-0 transition-opacity group-hover:opacity-100"></div>
                </button>
                
                <div className="flex min-w-[40px] items-center justify-center">
                  <span className="text-sm font-medium text-gray-900">{quantity}</span>
                </div>
                
                <button 
                  className="group relative flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white transition-all duration-300 hover:border-gray-400 hover:shadow-sm"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-2 w-2 text-gray-500 transition-colors group-hover:text-gray-700" />
                  <div className="absolute inset-0 rounded-full bg-gray-50 opacity-0 transition-opacity group-hover:opacity-100"></div>
                </button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <div className="relative overflow-hidden border border-black">
              <button 
                className="relative h-10 w-full bg-black text-white text-sm font-normal uppercase tracking-wider transition-all duration-300 ease-in-out hover:bg-white hover:text-black group"
                disabled={availableSizes.length === 0 || !selectedSize}
                onClick={async () => {
                  if (!selectedSize) {
                    toast.error("Vui lòng chọn kích thước")
                    return
                  }

                  // Find variant_id for selected size
                  const selectedVariant = product.variants?.find(
                    v => v.size_name === selectedSize && v.is_active === 1 && v.stock_quantity > 0
                  )

                  if (!selectedVariant) {
                    toast.error("Kích thước đã chọn không còn hàng")
                    return
                  }

                  try {
                    // Get customer token from tokenStore (not admin token)
                    const { tokenStore } = await import('@/lib/tokenStore')
                    let token = tokenStore.getAccessToken()
                    
                    // If token is expired, try to refresh
                    if (token && tokenStore.isTokenExpired()) {
                      try {
                        const newTokenData = await tokenStore.refreshToken()
                        token = newTokenData.token
                      } catch (refreshError) {
                        console.error('Token refresh failed:', refreshError)
                        token = null
                      }
                    }
                    
                    // If no token, redirect to login
                    if (!token) {
                      toast.error('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng')
                      setTimeout(() => {
                        window.location.href = '/login'
                      }, 1500)
                      return
                    }

                    const headers: HeadersInit = {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    }

                    const response = await fetch('/api/backend/v1/cart/add', {
                      method: 'POST',
                      headers,
                      body: JSON.stringify({
                        variant_id: selectedVariant.variant_id,
                        quantity: quantity,
                      }),
                    })

                    const result = await response.json()

                    if (result.success) {
                      // Show toast notification (like image 2)
                      toast.success(`Đã thêm ${quantity} ${product.product_name} (${selectedSize}) vào giỏ hàng`, {
                        icon: '✓',
                        duration: 3000,
                      })
                      
                      // Trigger cart update event
                      window.dispatchEvent(new Event('cartUpdated'))
                    } else {
                      // If token error, redirect to login
                      if (result.message?.includes('token') || result.message?.includes('unauthorized') || response.status === 401) {
                        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại')
                        setTimeout(() => {
                          window.location.href = '/login'
                        }, 1500)
                      } else {
                        toast.error(result.message || 'Không thể thêm vào giỏ hàng')
                      }
                    }
                  } catch (error) {
                    console.error('Error adding to cart:', error)
                    toast.error('Không thể thêm vào giỏ hàng. Vui lòng thử lại.')
                  }
                }}
              >
                <span className="relative z-10 font-sans font-bold uppercase tracking-wider">
                  {availableSizes.length === 0 ? "Out of Stock" : "THÊM VÀO GIỎ"}
                </span>
                <div className="absolute inset-0 bg-white transform translate-x-full transition-transform duration-300 ease-in-out group-hover:translate-x-0"></div>
              </button>
            </div>

            {/* Product Details */}
            <div className="border-t border-gray-200 pt-4">
              <details className="group">
                <summary className="flex cursor-pointer items-center justify-between py-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">+ Product Details</h3>
                  <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                </summary>
                <div className="pb-3 pt-1 text-xs text-gray-600">
                  <ul className="list-inside list-disc space-y-1">
                    {product.material && <li>Material: {product.material}</li>}
                    {product.stock !== undefined && <li>Stock: {product.stock} units</li>}
                    {product.category_name && <li>Category: {product.category_name}</li>}
                    {product.variant_count && <li>Available in {product.variant_count} variants</li>}
                    <li>Product ID: {product.product_id}</li>
                  </ul>
                </div>
              </details>

              <details className="group border-t border-gray-200">
                <summary className="flex cursor-pointer items-center justify-between py-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">+ Customer Care</h3>
                  <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                </summary>
                <div className="pb-3 pt-1 text-xs text-gray-600">
                  <p>Free standard shipping on all orders over $100. Delivery within 3-5 business days.</p>
                  <p className="mt-1">
                    We offer free returns within 30 days of purchase. Items must be unworn with original tags
                    attached.
                  </p>
                </div>
              </details>
            </div>
          </div>
        </div>
        </div>
      </div>
    </main>
  )
}
