'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { tokenStore } from '@/lib/tokenStore'
import { useLanguage } from '@/components/language-provider'

interface OrderData {
  order_id: number
  invoice_number: string
  total_amount: number
  status: string
  items: Array<{
    product_name_snapshot: string
    quantity: number
    unit_price: number
  }>
}

function PaymentSuccessFallback() {
  const { t } = useLanguage()
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center">{t('common.loading')}</div>
    </div>
  )
}

function PaymentSuccessContent() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderIdParam =
    searchParams.get('order_id') || searchParams.get('orderCode') || null
  const payosStatus = searchParams.get('status')
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const cartCleared = useRef(false)

  useEffect(() => {
    if (orderIdParam) {
      loadOrder()
      clearCart()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load on id only
  }, [orderIdParam])

  const clearCart = async () => {
    if (cartCleared.current) return
    cartCleared.current = true

    try {
      const token = await tokenStore.getValidToken()
      if (!token) return

      await fetch('/api/backend/v1/cart/clear', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      window.dispatchEvent(new CustomEvent('cart-updated'))
    } catch (error) {
      console.error('Error clearing cart:', error)
    }
  }

  const loadOrder = async () => {
    if (!orderIdParam) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      let token = tokenStore.getAccessToken()

      if (token && tokenStore.isTokenExpired()) {
        try {
          const newTokenData = await tokenStore.refreshToken()
          token = newTokenData.token
        } catch (refreshError) {
          console.error('Token refresh failed on success page:', refreshError)
          token = null
        }
      }

      if (!token) {
        setOrder(null)
        return
      }

      const response = await fetch(`/api/backend/v1/orders/${orderIdParam}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setOrder(data.data)
      }
    } catch (error) {
      console.error('Error loading order:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">{t('paymentSuccess.title')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {payosStatus === 'PAID' && (
            <p className="text-center text-sm text-green-700">{t('paymentSuccess.paidConfirmed')}</p>
          )}

          {!orderIdParam && (
            <p className="text-center text-sm text-gray-600">{t('paymentSuccess.thanksGeneric')}</p>
          )}

          {(order || orderIdParam) && (
            <>
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold">{t('paymentSuccess.thanksOrder')}</p>
                <p className="text-sm text-gray-500">
                  {t('paymentSuccess.orderId')}:{' '}
                  <span className="font-semibold">#{order?.order_id ?? orderIdParam}</span>
                </p>
                {order?.invoice_number && (
                  <p className="text-sm text-gray-500">
                    {t('paymentSuccess.invoiceNumber')}:{' '}
                    <span className="font-semibold">{order.invoice_number}</span>
                  </p>
                )}
                {!order && orderIdParam && (
                  <p className="text-sm text-gray-500">{t('paymentSuccess.loginForDetails')}</p>
                )}
              </div>

              {order && (
                <div className="border-t pt-4 space-y-2">
                  <h3 className="font-semibold mb-2">{t('paymentSuccess.orderDetails')}:</h3>
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>
                        {item.product_name_snapshot} x{item.quantity}
                      </span>
                      <span>
                        {(Number(item.unit_price) * Number(item.quantity)).toLocaleString('vi-VN')} ₫
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-bold">
                      <span>{t('paymentSuccess.total')}:</span>
                      <span>{Number(order.total_amount).toLocaleString('vi-VN')} ₫</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex gap-4 justify-center pt-4">
            <Button onClick={() => router.push(`/account`)}>{t('paymentSuccess.viewOrders')}</Button>
            <Button variant="outline" onClick={() => router.push('/all-products')}>
              {t('paymentSuccess.continueShopping')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<PaymentSuccessFallback />}>
      <PaymentSuccessContent />
    </Suspense>
  )
}
