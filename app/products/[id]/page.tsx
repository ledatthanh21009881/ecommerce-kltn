"use client"

import { useState, useEffect, use } from "react"
import Image from "next/image"
import Link from "next/link"
import { Minus, Plus, ChevronDown } from "lucide-react"
import { getProductById, type Product } from "@/lib/products"
import { toast } from "sonner"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import { useLanguage } from "@/components/language-provider"

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

// Helper function to get all sizes (including out of stock)
const getAllSizes = (product: Product): string[] => {
  if (product.variants && product.variants.length > 0) {
    return product.variants
      .filter(v => v.is_active === 1)
      .map(v => v.size_name || '')
      .filter(size => size)
  }
  return []
}

// Helper function to check if a size is out of stock
const isSizeOutOfStock = (product: Product, sizeName: string): boolean => {
  if (!product.variants) return true
  const variant = product.variants.find(
    v => v.size_name === sizeName && v.is_active === 1
  )
  return !variant || variant.stock_quantity <= 0
}

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useLanguage()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSize, setSelectedSize] = useState<string>("")
  const [quantity, setQuantity] = useState(1)
  const [cartItems, setCartItems] = useState<any[]>([])
  const [cartSidebarOpen, setCartSidebarOpen] = useState(false)
  const [cartSidebarItem, setCartSidebarItem] = useState<{
    productName: string
    imageUrl: string
    quantity: number
    unitPrice: number
    total: number
    size?: string
  } | null>(null)

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
        toast.error(t('product.failedToLoad'))
      } finally {
        setLoading(false)
      }
    }

    if (resolvedParams.id) {
      fetchProduct()
    }
  }, [resolvedParams.id])

  // Fetch cart data to check current quantity in cart
  useEffect(() => {
    const fetchCart = async () => {
      try {
        const { tokenStore } = await import('@/lib/tokenStore')
        const token = tokenStore.getAccessToken()
        
        if (token) {
          const response = await fetch('/api/backend/v1/cart', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          const data = await response.json()
          if (data.success && data.data?.items) {
            setCartItems(data.data.items)
          }
        } else {
          // Check guest cart
          const guestCart = localStorage.getItem('guestCart')
          if (guestCart) {
            setCartItems(JSON.parse(guestCart))
          }
        }
      } catch (error) {
        console.error('Error fetching cart:', error)
      }
    }
    
    fetchCart()
    
    // Listen for cart updates
    const handleCartUpdate = () => {
      fetchCart()
    }
    window.addEventListener('cartUpdated', handleCartUpdate)
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate)
    }
  }, [])

  // Reset quantity when size changes if quantity exceeds new size's stock
  useEffect(() => {
    if (selectedSize && product) {
      const variant = product.variants?.find(
        v => v.size_name === selectedSize && v.is_active === 1
      )
      if (variant && variant.stock_quantity > 0) {
        // Calculate current cart quantity for this variant
        const cartItem = cartItems.find(item => item.variant_id === variant.variant_id)
        const currentCartQuantity = cartItem ? cartItem.quantity : 0
        const maxAllowed = variant.stock_quantity - currentCartQuantity
        setQuantity(prevQuantity => {
          if (prevQuantity > maxAllowed) {
            return Math.max(1, maxAllowed)
          }
          return prevQuantity
        })
      } else {
        setQuantity(1)
      }
    }
  }, [selectedSize, product, cartItems])

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
  const allSizes = getAllSizes(product)
  
  // Get available sizes (for default selection and validation)
  const availableSizes = allSizes.filter(size => {
    const variant = product.variants?.find(
      v => v.size_name === size && v.is_active === 1
    )
    return variant && variant.stock_quantity > 0
  })

  // Helper function to get selected variant
  const getSelectedVariant = () => {
    if (!selectedSize || !product.variants) return null
    return product.variants.find(
      v => v.size_name === selectedSize && v.is_active === 1
    )
  }

  // Check if selected variant is out of stock
  const isVariantOutOfStock = () => {
    const variant = getSelectedVariant()
    return !variant || variant.stock_quantity <= 0
  }

  // Helper function to get current quantity in cart for selected variant
  const getCurrentCartQuantity = () => {
    if (!selectedSize || !product) return 0
    const variant = product.variants?.find(
      v => v.size_name === selectedSize && v.is_active === 1
    )
    if (!variant) return 0
    
    const cartItem = cartItems.find(item => item.variant_id === variant.variant_id)
    return cartItem ? cartItem.quantity : 0
  }

  // Check if can add to cart (quantity + cart quantity <= stock)
  const canAddToCart = () => {
    const variant = getSelectedVariant()
    if (!variant || variant.stock_quantity <= 0) return false
    
    const currentCartQuantity = getCurrentCartQuantity()
    return (quantity + currentCartQuantity) <= variant.stock_quantity
  }

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
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">{t('product.selectSizeLabel')}</h3>
                <div className="flex gap-3">
                  {allSizes.length > 0 ? (
                    allSizes.map((size) => {
                      const isOutOfStock = isSizeOutOfStock(product, size)
                      return (
                      <button
                        key={size}
                          onClick={() => {
                            if (!isOutOfStock) {
                              setSelectedSize(size)
                            }
                          }}
                          disabled={isOutOfStock}
                          className={`text-xs font-normal transition-colors ${
                            isOutOfStock
                              ? 'text-gray-400 cursor-not-allowed opacity-50'
                              : selectedSize === size 
                            ? 'border-b border-gray-800 text-gray-800' 
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        {size}
                      </button>
                      )
                    })
                  ) : (
                    <p className="text-gray-500 text-xs">{t('product.noSizes')}</p>
                  )}
                </div>
              </div>
              <Link href="/size-guide" className="mt-1 inline-block text-xs underline underline-offset-4">
                {t('product.sizeGuide')}
              </Link>
            </div>

            {/* Quantity */}
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-800">{t('product.quantity')}</h3>
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
                  className="group relative flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white transition-all duration-300 hover:border-gray-400 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {
                    const variant = getSelectedVariant()
                    const currentCartQuantity = getCurrentCartQuantity()
                    
                    if (variant && variant.stock_quantity) {
                      const maxAllowed = variant.stock_quantity - currentCartQuantity
                      if (quantity < maxAllowed) {
                        setQuantity(quantity + 1)
                      } else {
                        toast.error(t('product.insufficientStockAdd', { count: String(maxAllowed) }))
                      }
                    } else {
                      setQuantity(quantity + 1)
                    }
                  }}
                  disabled={(() => {
                    const variant = getSelectedVariant()
                    const currentCartQuantity = getCurrentCartQuantity()
                    if (!variant) return false
                    const maxAllowed = variant.stock_quantity - currentCartQuantity
                    return quantity >= maxAllowed
                  })()}
                >
                  <Plus className="h-2 w-2 text-gray-500 transition-colors group-hover:text-gray-700" />
                  <div className="absolute inset-0 rounded-full bg-gray-50 opacity-0 transition-opacity group-hover:opacity-100"></div>
                </button>
              </div>
              {(() => {
                const variant = getSelectedVariant()
                const currentCartQuantity = getCurrentCartQuantity()
                if (variant && variant.stock_quantity && variant.stock_quantity > 0) {
                  const availableToAdd = variant.stock_quantity - currentCartQuantity
                  return (
                    <p className="mt-2 text-xs text-gray-500">
                      {t('product.remainingStock', { count: String(variant.stock_quantity) })}
                      {currentCartQuantity > 0 && (
                        <span className="ml-2 text-gray-400">
                          {t('product.inCartCanAdd', {
                            inCart: String(currentCartQuantity),
                            canAdd: String(availableToAdd),
                          })}
                        </span>
                      )}
                    </p>
                  )
                }
                return null
              })()}
            </div>

            {/* Add to Cart / View Cart Button */}
            <div className="relative overflow-hidden border border-black">
              {getCurrentCartQuantity() > 0 ? (
                <Link
                  href="/cart"
                  className="relative flex h-10 w-full items-center justify-center text-sm font-normal uppercase tracking-wider transition-all duration-300 ease-in-out group bg-black text-white hover:bg-white hover:text-black"
                >
                  <span className="relative z-10 font-sans font-bold uppercase tracking-wider">{t('product.viewCart')}</span>
                  <div className="absolute inset-0 bg-white transform translate-x-full transition-transform duration-300 ease-in-out group-hover:translate-x-0" />
                </Link>
              ) : (
              <button 
                className={`relative h-10 w-full text-sm font-normal uppercase tracking-wider transition-all duration-300 ease-in-out group ${
                  isVariantOutOfStock() || availableSizes.length === 0 || !selectedSize || !canAddToCart()
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-black text-white hover:bg-white hover:text-black'
                }`}
                disabled={availableSizes.length === 0 || !selectedSize || isVariantOutOfStock() || !canAddToCart()}
                onClick={async () => {
                  if (!selectedSize) {
                    toast.error(t('product.selectSize'))
                    return
                  }

                  // Find variant_id for selected size
                  const selectedVariant = product.variants?.find(
                    v => v.size_name === selectedSize && v.is_active === 1 && v.stock_quantity > 0
                  )

                  if (!selectedVariant) {
                    toast.error(t('product.sizeOutOfStock'))
                    return
                  }

                  // Check if quantity exceeds stock
                  if (quantity > selectedVariant.stock_quantity) {
                    toast.error(t('product.insufficientStock', { count: String(selectedVariant.stock_quantity) }))
                    setQuantity(selectedVariant.stock_quantity)
                    return
                  }

                  // Check if quantity + cart quantity exceeds stock
                  const currentCartQuantity = getCurrentCartQuantity()
                  if (quantity + currentCartQuantity > selectedVariant.stock_quantity) {
                    const availableToAdd = selectedVariant.stock_quantity - currentCartQuantity
                    toast.error(`Không đủ hàng trong kho. Số lượng còn lại có thể thêm: ${availableToAdd}`)
                    if (availableToAdd > 0) {
                      setQuantity(availableToAdd)
                    }
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
                      toast.error(t('product.loginToAddCart'))
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
                      const unitPrice = parseFloat(product.list_price || '0')
                      const total = unitPrice * quantity
                      setCartSidebarItem({
                        productName: product.product_name,
                        imageUrl: productImages[0],
                        quantity,
                        unitPrice,
                        total,
                        size: selectedSize,
                      })
                      setCartSidebarOpen(true)
                      // Trigger cart update event
                      window.dispatchEvent(new Event('cartUpdated'))
                    } else {
                      // If token error, redirect to login
                      if (result.message?.includes('token') || result.message?.includes('unauthorized') || response.status === 401) {
                        toast.error(t('product.sessionExpired'))
                        setTimeout(() => {
                          window.location.href = '/login'
                        }, 1500)
                      } else {
                        toast.error(result.message || t('product.addToCartFailed'))
                      }
                    }
                  } catch (error) {
                    console.error('Error adding to cart:', error)
                    toast.error(t('product.addToCartError'))
                  }
                }}
              >
                <span className="relative z-10 font-sans font-bold uppercase tracking-wider">
                  {availableSizes.length === 0 || isVariantOutOfStock()
                    ? t('product.outOfStockUpper')
                    : t('product.addToCartUpper')}
                </span>
                <div className="absolute inset-0 bg-white transform translate-x-full transition-transform duration-300 ease-in-out group-hover:translate-x-0"></div>
              </button>
              )}
            </div>

            {/* Product Details */}
            <div className="border-t border-gray-200 pt-4">
              <details className="group">
                <summary className="flex cursor-pointer items-center justify-between py-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">+ {t('product.productDetails')}</h3>
                  <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                </summary>
                <div className="pb-3 pt-1 text-xs text-gray-600">
                  <ul className="list-inside list-disc space-y-1">
                    {product.material && (
                      <li>
                        {t('product.materialLabel')}: {product.material}
                      </li>
                    )}
                    {product.stock !== undefined && (
                      <li>
                        {t('product.stockLabel')}:{' '}
                        {t('product.stockUnits', { count: String(product.stock) })}
                      </li>
                    )}
                    {product.category_name && (
                      <li>
                        {t('product.categoryLabel')}: {product.category_name}
                      </li>
                    )}
                    {product.variant_count && (
                      <li>{t('product.variantsLabel', { count: String(product.variant_count) })}</li>
                    )}
                  </ul>
                </div>
              </details>

              <details className="group border-t border-gray-200">
                <summary className="flex cursor-pointer items-center justify-between py-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">+ {t('product.customerCare')}</h3>
                  <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                </summary>
                <div className="pb-3 pt-1 text-xs text-gray-600">
                  <p>{t('product.careShipping')}</p>
                  <p className="mt-1">{t('product.careReturns')}</p>
                </div>
              </details>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Cart sidebar (slide from right, like hình 2) */}
      <Sheet open={cartSidebarOpen} onOpenChange={setCartSidebarOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetTitle className="sr-only">Giỏ hàng</SheetTitle>
          {cartSidebarItem && (
            <div className="flex flex-col flex-1 pt-8">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-4">
                Giỏ hàng
              </h2>
              <div className="flex gap-4">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-gray-100">
                  <Image
                    src={cartSidebarItem.imageUrl}
                    alt={cartSidebarItem.productName}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm font-bold uppercase tracking-wider text-gray-900">
                    {cartSidebarItem.productName}
                    {cartSidebarItem.size && ` (${cartSidebarItem.size})`}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded border border-gray-200 bg-gray-50 px-2 text-sm text-gray-700">
                      {cartSidebarItem.quantity}
                    </span>
                    <span className="text-sm text-gray-600">
                      {formatPrice(cartSidebarItem.unitPrice)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                <span className="text-sm text-gray-500">TỔNG CỘNG:</span>
                <span className="text-base font-semibold text-red-600">
                  {formatPrice(cartSidebarItem.total)}
                </span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Link
                  href="/cart"
                  className="flex h-11 items-center justify-center rounded border border-black bg-black text-sm font-medium uppercase tracking-wider text-white transition-colors hover:bg-white hover:text-black"
                  onClick={() => setCartSidebarOpen(false)}
                >
                  Xem giỏ hàng
                </Link>
                <Link
                  href="/checkout"
                  className="flex h-11 items-center justify-center rounded border border-black bg-black text-sm font-medium uppercase tracking-wider text-white transition-colors hover:bg-white hover:text-black"
                  onClick={() => setCartSidebarOpen(false)}
                >
                  Thanh toán
                </Link>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </main>
  )
}
