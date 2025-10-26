'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { getAuthData } from '@/lib/admin-auth'

interface CartItem {
  item_id: number
  cart_id: number
  variant_id: number
  quantity: number
  unit_price_snapshot: number
  product_id: number
  product_name: string
  slug: string
  list_price: number
  compare_at_price: number
  size_name: string
  sku: string
  stock_quantity: number
  variant_status: string
  image_url: string
  image_alt: string
}

interface CartData {
  items: CartItem[]
  item_count: number
  subtotal: number
  total: number
}

export default function CartPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [cartData, setCartData] = useState<CartData>({
    items: [],
    item_count: 0,
    subtotal: 0,
    total: 0
  })
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<number | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    checkAuthAndLoadCart()
  }, [])

  const checkAuthAndLoadCart = async () => {
    try {
      const { token } = getAuthData()
      setIsLoggedIn(!!token)
      
      if (token) {
        await loadUserCart(token)
      } else {
        await loadGuestCart()
      }
    } catch (error) {
      console.error('Error checking auth:', error)
      await loadGuestCart()
    } finally {
      setLoading(false)
    }
  }

  const loadUserCart = async (token: string) => {
    try {
      const response = await fetch('/api/backend/v1/cart', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setCartData(data.data)
      } else {
        console.error('Failed to load cart:', data.message)
        await loadGuestCart()
      }
    } catch (error) {
      console.error('Error loading user cart:', error)
      await loadGuestCart()
    }
  }

  const loadGuestCart = () => {
    try {
      const guestCart = localStorage.getItem('guestCart')
      if (guestCart) {
        const items = JSON.parse(guestCart)
        const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0)
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
    if (newQuantity < 0) return

    setUpdating(itemId)
    
    try {
      if (isLoggedIn) {
        const { token } = getAuthData()
        const response = await fetch(`/api/backend/v1/cart/update/${itemId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ quantity: newQuantity })
        })

        const data = await response.json()
        
        if (data.success) {
          setCartData(data.data)
          toast.success(t('cartUpdated'))
        } else {
          toast.error(data.message || t('failedToUpdate'))
        }
      } else {
        // Update guest cart
        const guestCart = JSON.parse(localStorage.getItem('guestCart') || '[]')
        const updatedCart = guestCart.map((item: any) => 
          item.item_id === itemId ? { ...item, quantity: newQuantity } : item
        ).filter((item: any) => item.quantity > 0)
        
        localStorage.setItem('guestCart', JSON.stringify(updatedCart))
        loadGuestCart()
        toast.success(t('cartUpdated'))
      }
    } catch (error) {
      console.error('Error updating quantity:', error)
      toast.error(t('failedToUpdate'))
    } finally {
      setUpdating(null)
    }
  }

  const removeItem = async (itemId: number) => {
    try {
      if (isLoggedIn) {
        const { token } = getAuthData()
        const response = await fetch(`/api/backend/v1/cart/remove/${itemId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        const data = await response.json()
        
        if (data.success) {
          setCartData(data.data)
          toast.success(t('itemRemovedFromCart'))
        } else {
          toast.error(data.message || t('failedToDelete'))
        }
      } else {
        // Remove from guest cart
        const guestCart = JSON.parse(localStorage.getItem('guestCart') || '[]')
        const updatedCart = guestCart.filter((item: any) => item.item_id !== itemId)
        localStorage.setItem('guestCart', JSON.stringify(updatedCart))
        loadGuestCart()
        toast.success(t('itemRemovedFromCart'))
      }
    } catch (error) {
      console.error('Error removing item:', error)
      toast.error(t('failedToDelete'))
    }
  }

  const handleCheckout = () => {
    if (!isLoggedIn) {
      toast.error(t('loginToSyncCart'))
      router.push('/login')
      return
    }
    
    if (cartData.items.length === 0) {
      toast.error(t('cartEmpty'))
      return
    }
    
    router.push('/checkout')
  }

  const calculateShipping = () => {
    return cartData.subtotal >= 1000000 ? 0 : 30000
  }

  const calculateTotal = () => {
    return cartData.subtotal + calculateShipping()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">{t('loading')}...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('back')}
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('shoppingCart')}</h1>
          <p className="text-gray-600">
            {cartData.item_count} {t('itemCount')} • {isLoggedIn ? t('userCart') : t('guestCart')}
          </p>
        </div>

        {cartData.items.length === 0 ? (
          /* Empty Cart */
          <Card className="text-center py-12">
            <CardContent>
              <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('cartEmpty')}</h3>
              <p className="text-gray-600 mb-6">{t('cartEmptyMessage')}</p>
              <Button onClick={() => router.push('/shop')}>
                {t('continueShopping')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    {t('cartItems')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cartData.items.map((item) => (
                    <div key={item.item_id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                      {/* Product Image */}
                      <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.image_alt || item.product_name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <ShoppingCart className="h-8 w-8 text-gray-400" />
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.product_name}</h3>
                        <p className="text-sm text-gray-600">
                          {t('size')}: {item.size_name} • SKU: {item.sku}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-medium text-gray-900">
                            {item.unit_price_snapshot.toLocaleString()}₫
                          </span>
                          {item.compare_at_price && item.compare_at_price > item.unit_price_snapshot && (
                            <span className="text-sm text-gray-500 line-through">
                              {item.compare_at_price.toLocaleString()}₫
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.item_id, item.quantity - 1)}
                          disabled={updating === item.item_id || item.quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        
                        <span className="w-8 text-center font-medium">
                          {updating === item.item_id ? '...' : item.quantity}
                        </span>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.item_id, item.quantity + 1)}
                          disabled={updating === item.item_id || item.quantity >= item.stock_quantity}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Subtotal */}
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {(item.quantity * item.unit_price_snapshot).toLocaleString()}₫
                        </p>
                      </div>

                      {/* Remove Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem(item.item_id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Cart Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-8">
                <CardHeader>
                  <CardTitle>{t('cartSummary')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Subtotal */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('subtotal')}</span>
                    <span className="font-medium">{cartData.subtotal.toLocaleString()}₫</span>
                  </div>

                  {/* Shipping */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('shipping')}</span>
                    <span className="font-medium">
                      {calculateShipping() === 0 ? (
                        <Badge variant="secondary" className="text-green-600">
                          {t('free')}
                        </Badge>
                      ) : (
                        `${calculateShipping().toLocaleString()}₫`
                      )}
                    </span>
                  </div>

                  {/* Free Shipping Notice */}
                  {cartData.subtotal < 1000000 && (
                    <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                      {t('freeShipping')}
                    </p>
                  )}

                  {/* Total */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>{t('total')}</span>
                      <span>{calculateTotal().toLocaleString()}₫</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Button
                    onClick={handleCheckout}
                    className="w-full bg-black hover:bg-gray-800 text-white"
                    size="lg"
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    {t('proceedToCheckout')}
                  </Button>

                  {/* Login Notice for Guest */}
                  {!isLoggedIn && (
                    <p className="text-sm text-gray-600 text-center">
                      {t('loginToSyncCart')}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
