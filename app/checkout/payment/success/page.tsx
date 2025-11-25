'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

export default function PaymentSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orderId) {
      loadOrder()
    }
  }, [orderId])

  const loadOrder = async () => {
    try {
      setLoading(true)
      const { token } = await import('@/lib/admin-auth').then(m => m.getAuthData())
      
      const response = await fetch(`/api/backend/v1/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
        <div className="text-center">Loading...</div>
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
            <CardTitle className="text-2xl">Đặt hàng thành công!</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {order && (
            <>
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold">Cảm ơn bạn đã đặt hàng!</p>
                <p className="text-sm text-gray-500">
                  Mã đơn hàng: <span className="font-semibold">#{order.order_id}</span>
                </p>
                {order.invoice_number && (
                  <p className="text-sm text-gray-500">
                    Số hóa đơn: <span className="font-semibold">{order.invoice_number}</span>
                  </p>
                )}
              </div>

              <div className="border-t pt-4 space-y-2">
                <h3 className="font-semibold mb-2">Chi tiết đơn hàng:</h3>
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.product_name_snapshot} x{item.quantity}</span>
                    <span>{(item.unit_price * item.quantity).toLocaleString('vi-VN')} ₫</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-bold">
                    <span>Tổng cộng:</span>
                    <span>{order.total_amount.toLocaleString('vi-VN')} ₫</span>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-4 justify-center pt-4">
            <Button onClick={() => router.push(`/account/orders`)}>
              Xem đơn hàng của tôi
            </Button>
            <Button variant="outline" onClick={() => router.push('/')}>
              Tiếp tục mua sắm
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

