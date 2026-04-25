'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Minus, Plus, X, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { tokenStore } from '@/lib/tokenStore'
import { getProductById } from '@/lib/products'
import { useLanguage } from '@/components/language-provider'

interface CartItem {
  item_id: number
  variant_id: number
  quantity: number
  unit_price_snapshot: number
  product_id: number
  product_name: string
  size_name: string
  image_url?: string
}

interface CartData {
  items: CartItem[]
  item_count: number
  subtotal: number
  total: number
}

export default function CartPage() {
  const router = useRouter()
  const { t, language } = useLanguage()
  const [cartData, setCartData] = useState<CartData>({
    items: [],
    item_count: 0,
    subtotal: 0,
    total: 0
  })
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [itemStockStatus, setItemStockStatus] = useState<Record<number, { stock: number; isOutOfStock: boolean }>>({})

  useEffect(() => {
    loadCart()
    
    // Listen for cart updates
    const handleCartUpdate = () => {
      loadCart()
    }
    window.addEventListener('cartUpdated', handleCartUpdate)
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate)
    }
  }, [])

  // Fetch stock status for each item
  useEffect(() => {
    const checkItemStock = async () => {
      if (cartData.items.length === 0) {
        setItemStockStatus({})
        return
      }
      
      const stockStatus: Record<number, { stock: number; isOutOfStock: boolean }> = {}
      
      for (const item of cartData.items) {
        try {
          // Fetch product to get variant stock
          const product = await getProductById(item.product_id)
          const variant = product.variants?.find(v => v.variant_id === item.variant_id)
          
          if (variant) {
            stockStatus[item.item_id] = {
              stock: variant.stock_quantity || 0,
              isOutOfStock: (variant.stock_quantity || 0) < item.quantity
            }
          } else {
            stockStatus[item.item_id] = {
              stock: 0,
              isOutOfStock: true
            }
          }
        } catch (error) {
          console.error(`Error checking stock for item ${item.item_id}:`, error)
          stockStatus[item.item_id] = {
            stock: 0,
            isOutOfStock: true
          }
        }
      }
      
      setItemStockStatus(stockStatus)
    }
    
    checkItemStock()
  }, [cartData.items])

  // Check if any item is out of stock
  const hasOutOfStockItems = () => {
    return Object.values(itemStockStatus).some(status => status.isOutOfStock)
  }

  const loadCart = async () => {
    try {
      setLoading(true)
      const token = tokenStore.getAccessToken()
      
      if (token) {
        // Load user cart
        const response = await fetch('/api/backend/v1/cart', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        const data = await response.json()
        if (data.success) {
          setCartData(data.data)
        } else {
          // Fallback to guest cart
          loadGuestCart()
        }
      } else {
        // Load guest cart
        loadGuestCart()
      }
    } catch (error) {
      console.error('Error loading cart:', error)
      loadGuestCart()
    } finally {
      setLoading(false)
    }
  }

  const loadGuestCart = () => {
    try {
      const guestCart = localStorage.getItem('guestCart')
      if (guestCart) {
        const items = JSON.parse(guestCart)
        const subtotal = items.reduce((sum: number, item: any) => 
          sum + (item.quantity * (item.unit_price_snapshot || item.list_price || 0)), 0
        )
        setCartData({
          items: items,
          item_count: items.length,
          subtotal: subtotal,
          total: subtotal
        })
      }
    } catch (error) {
      console.error('Error loading guest cart:', error)
    }
  }

  const updateQuantity = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return

    setUpdating(itemId)
    
    try {
      const token = tokenStore.getAccessToken()
      
      if (token) {
        console.log('🛒 Frontend: Updating quantity for item', itemId, 'to', newQuantity)
        const response = await fetch(`/api/backend/v1/cart/update?item_id=${itemId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ quantity: newQuantity })
        })

        console.log('🛒 Frontend: Response status', response.status)
        const data = await response.json()
        console.log('🛒 Frontend: Response data', data)
        
        if (data.success) {
          setCartData(data.data)
          setErrorMessage(null) // Clear error on success
          toast.success(t('cart.updated'))
        } else {
          // Check if it's an insufficient stock error
          if (data.message?.includes('Insufficient stock') || data.message?.includes('Available:')) {
            const vietnameseMessage = formatErrorMessage(data.message)
            setErrorMessage(vietnameseMessage)
            // Auto-hide after 8 seconds
            setTimeout(() => setErrorMessage(null), 8000)
          } else {
            toast.error(data.message || t('cart.cannotUpdate'))
          }
          // Reload cart to revert changes
          loadCart()
        }
      } else {
        // Update guest cart
        const guestCart = JSON.parse(localStorage.getItem('guestCart') || '[]')
        const updatedCart = guestCart.map((item: any) => 
          item.item_id === itemId ? { ...item, quantity: newQuantity } : item
        ).filter((item: any) => item.quantity > 0)
        
        localStorage.setItem('guestCart', JSON.stringify(updatedCart))
        loadGuestCart()
        toast.success(t('cart.updated'))
      }
    } catch (error) {
      console.error('Error updating quantity:', error)
      toast.error(t('cart.cannotUpdate'))
      // Reload cart on error
      loadCart()
    } finally {
      setUpdating(null)
    }
  }

  const removeItem = async (itemId: number) => {
    try {
      const token = tokenStore.getAccessToken()
      
      if (token) {
        console.log('🛒 Frontend: Removing item', itemId)
        const response = await fetch(`/api/backend/v1/cart/remove?item_id=${itemId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        console.log('🛒 Frontend: Response status', response.status)
        const data = await response.json()
        console.log('🛒 Frontend: Response data', data)
        
        if (data.success) {
          setCartData(data.data)
          toast.success(t('cart.itemRemoved'))
        } else {
          toast.error(data.message || t('cart.cannotRemove'))
          // Reload cart on error
          loadCart()
        }
      } else {
        // Remove from guest cart
        const guestCart = JSON.parse(localStorage.getItem('guestCart') || '[]')
        const updatedCart = guestCart.filter((item: any) => item.item_id !== itemId)
        localStorage.setItem('guestCart', JSON.stringify(updatedCart))
        loadGuestCart()
        toast.success(t('cart.itemRemoved'))
      }
    } catch (error) {
      console.error('Error removing item:', error)
      toast.error(t('cart.cannotRemove'))
      // Reload cart on error
      loadCart()
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(language === 'en' ? 'en-US' : 'vi-VN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price) + ' ₫'
  }

  // Format error message to Vietnamese
  const formatErrorMessage = (message: string): string => {
    if (message.includes('Insufficient stock')) {
      // Extract available quantity if present
      const availableMatch = message.match(/Available:\s*(\d+)/i)
      if (availableMatch) {
        const available = availableMatch[1]
        return `${t('cart.insufficientStock')}. ${t('cart.remainingStock')}: ${available}`
      }
      return t('cart.insufficientStock')
    }
    // Return original message if not a stock error
    return message
  }

  if (loading) {
    return (
      <div className="p-8 max-w-[85%] ml-[224px] mr-8">
        <div className="py-12 text-center text-gray-600">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <>
      {/* Error Banner - Top Right */}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top-5">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-base font-semibold text-red-800">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="ml-4 flex-shrink-0 text-red-500 hover:text-red-700 transition-colors"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-8 max-w-[85%] ml-[224px] mr-8">
        {cartData.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-[82px] pb-[82px] text-center">
            <p className="mb-6 text-lg text-gray-600">{t('cart.empty')}</p>
            <Link
              href="/all-products"
              className="inline-block border border-black px-8 py-3 text-sm font-medium transition-colors hover:bg-black hover:text-white"
            >
              {t('cart.continueShopping')}
            </Link>
          </div>
        ) : (
          <div className="grid gap-12 lg:grid-cols-3">
            {/* Left Column - Cart Items */}
            <div className="lg:col-span-2 space-y-8">
              {/* Cart Items */}
              <div className="space-y-6">
                {cartData.items.map((item) => {
                  const stockStatus = itemStockStatus[item.item_id]
                  const isOutOfStock = stockStatus?.isOutOfStock || false
                  
                  return (
                    <div 
                      key={item.item_id} 
                      className={`flex gap-6 pb-6 border-b border-gray-200 ${isOutOfStock ? 'opacity-50' : ''}`}
                    >
                    {/* Product Image */}
                    <div className="relative w-24 h-32 flex-shrink-0 overflow-hidden bg-gray-100">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.product_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          {t('cart.noImage')}
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-serif text-lg font-light mb-1">{item.product_name}</h3>
                          <p className="text-sm text-gray-500 mb-2">
                            {t('cart.defaultTitle')} / {item.size_name}
                          </p>
                            {isOutOfStock && (
                              <p className="text-xs text-red-600 mb-2">
                                {t('cart.outOfStock')} ({t('cart.remainingStock')}: {stockStatus?.stock || 0})
                              </p>
                            )}
                        </div>
                        <button
                          onClick={() => removeItem(item.item_id)}
                          className="text-gray-400 hover:text-black transition-colors"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Quantity Selector and Price */}
                      <div className="flex items-center justify-between">
                          <div className={`flex h-8 w-24 items-center border border-gray-300 ${isOutOfStock ? 'opacity-50' : ''}`}>
                          <button
                              className="flex h-full w-8 items-center justify-center border-r border-gray-300 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => updateQuantity(item.item_id, item.quantity - 1)}
                              disabled={updating === item.item_id || item.quantity <= 1 || isOutOfStock}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <div className="flex h-full flex-1 items-center justify-center text-sm">
                            {updating === item.item_id ? '...' : item.quantity}
                          </div>
                          <button
                              className="flex h-full w-8 items-center justify-center border-l border-gray-300 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => updateQuantity(item.item_id, item.quantity + 1)}
                              disabled={updating === item.item_id || isOutOfStock || (stockStatus && item.quantity >= stockStatus.stock)}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-sm font-medium">
                          {formatPrice(item.quantity * item.unit_price_snapshot)}
                        </p>
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>

            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 border border-gray-200 rounded-lg p-6 bg-white">
                <h2 className="text-lg font-semibold mb-6">{t('cart.orderSummary')}</h2>
                
                <div className="space-y-4 mb-6 pb-6 border-b">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('cart.subtotal')}:</span>
                    <span className="font-medium">{formatPrice(cartData.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('cart.shipping')}:</span>
                    <span className="font-medium">{t('cart.free')}</span>
                  </div>
                  <div className="flex justify-between pt-4 border-t">
                    <span className="text-lg font-semibold">{t('cart.total')}:</span>
                    <span className="text-lg font-semibold">{formatPrice(cartData.subtotal)}</span>
                  </div>
                </div>

                <Button
                  className="w-full h-12 mb-4 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={hasOutOfStockItems()}
                  onClick={() => {
                    if (hasOutOfStockItems()) {
                      toast.error(t('cart.removeOutOfStockBeforeCheckout'))
                      return
                    }
                    const token = tokenStore.getAccessToken()
                    if (!token) {
                      toast.error(t('cart.loginToCheckout'))
                      router.push('/login')
                      return
                    }
                    router.push('/checkout')
                  }}
                >
                  {t('cart.proceedToCheckout')}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  {t('cart.freeShippingOver100')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
