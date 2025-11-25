'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PaymentData {
  payment_id: number
  order_id: number
  method: string
  status: string
  paid_amount: number
}

interface OrderData {
  order_id: number
  total_amount: number
  items: Array<{
    product_name_snapshot: string
    quantity: number
    unit_price: number
  }>
}

export default function ApprovePaymentPage() {
  const router = useRouter()
  const params = useParams()
  const paymentId = params?.paymentId as string
  const [payment, setPayment] = useState<PaymentData | null>(null)
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)

  useEffect(() => {
    if (paymentId) {
      loadData()
    }
  }, [paymentId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load payment
      const paymentRes = await fetch(`/api/backend/v1/payments/${paymentId}/status`)
      const paymentData = await paymentRes.json()
      
      if (paymentData.success) {
        setPayment(paymentData.data)
        
        // If already confirmed, redirect to success
        if (paymentData.data.status === 'confirmed') {
          router.push(`/checkout/payment/success?order_id=${paymentData.data.order_id}`)
          return
        }

        // Load order details from payment response (no token needed)
        if (paymentData.data.order) {
          setOrder(paymentData.data.order)
        }
      } else {
        toast.error(paymentData.message || 'Payment not found')
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load payment data')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    try {
      setApproving(true)
      const response = await fetch(`/api/backend/v1/payments/${paymentId}/approve`, {
        method: 'POST'
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Thanh toán thành công!')
        router.push(`/checkout/payment/success?order_id=${payment?.order_id}`)
      } else {
        toast.error(data.message || 'Failed to approve payment')
      }
    } catch (error) {
      console.error('Error approving payment:', error)
      toast.error('Failed to approve payment')
    } finally {
      setApproving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!payment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-4">Payment not found</h2>
              <Button onClick={() => router.push('/')}>Go Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Xác nhận thanh toán</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {order && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Đơn hàng #{order.order_id}</h3>
                <div className="space-y-2 text-sm">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{item.product_name_snapshot} x{item.quantity}</span>
                      <span>{(item.unit_price * item.quantity).toLocaleString('vi-VN')} ₫</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>Tổng cộng:</span>
                  <span>{order.total_amount.toLocaleString('vi-VN')} ₫</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <Button
              className="w-full h-12 text-lg"
              onClick={handleApprove}
              disabled={approving || payment.status !== 'pending'}
            >
              {approving ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/')}
            >
              Hủy
            </Button>
          </div>

          {payment.status !== 'pending' && (
            <p className="text-center text-sm text-gray-500">
              Payment status: {payment.status}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

