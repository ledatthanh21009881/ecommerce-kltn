'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { tokenStore } from '@/lib/tokenStore'

interface PaymentData {
  payment_id: number
  order_id: number
  method: string
  status: string
  payment_url: string | null
  expires_at: string | null
}

export default function PaymentPage() {
  const router = useRouter()
  const params = useParams()
  const paymentId = params?.paymentId as string
  const [payment, setPayment] = useState<PaymentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [polling, setPolling] = useState(false)

  useEffect(() => {
    if (paymentId) {
      loadPayment()
    }
  }, [paymentId])

  useEffect(() => {
    if (payment && payment.status === 'pending' && (payment.method === 'vietqr' || payment.method === 'mock_qr')) {
      // Start polling for status updates
      setPolling(true)
      const interval = setInterval(() => {
        checkPaymentStatus()
      }, 3000) // Poll every 3 seconds

      return () => clearInterval(interval)
    }
  }, [payment])

  const loadPayment = async () => {
    try {
      setLoading(true)
      let token = tokenStore.getAccessToken()
      
      // Try to refresh token if expired
      if (token && tokenStore.isTokenExpired()) {
        try {
          const newTokenData = await tokenStore.refreshToken()
          token = newTokenData.token
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError)
          token = null
        }
      }
      
      if (!token) {
        toast.error('Vui lòng đăng nhập để xem thanh toán')
        router.push('/login')
        return
      }
      
      const response = await fetch(`/api/backend/v1/payments/${paymentId}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        setPayment(data.data)
        
        // If COD or already confirmed, redirect to success
        if (data.data.method === 'cod' || data.data.status === 'confirmed') {
          router.push(`/checkout/payment/success?order_id=${data.data.order_id}`)
        }
        // If VNPay, redirect to payment URL
        else if (data.data.method === 'vnpay' && data.data.payment_url) {
          window.location.href = data.data.payment_url
        }
      } else {
        toast.error(data.message || 'Failed to load payment')
      }
    } catch (error) {
      console.error('Error loading payment:', error)
      toast.error('Failed to load payment')
    } finally {
      setLoading(false)
    }
  }

  const checkPaymentStatus = async () => {
    try {
      let token = tokenStore.getAccessToken()
      
      // Try to refresh token if expired
      if (token && tokenStore.isTokenExpired()) {
        try {
          const newTokenData = await tokenStore.refreshToken()
          token = newTokenData.token
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError)
          token = null
        }
      }
      
      if (!token) {
        return
      }
      
      const response = await fetch(`/api/backend/v1/payments/${paymentId}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success && data.data.status === 'confirmed') {
        setPolling(false)
        router.push(`/checkout/payment/success?order_id=${data.data.order_id}`)
      }
    } catch (error) {
      console.error('Error checking payment status:', error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!payment) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Payment not found</h1>
          <Button onClick={() => router.push('/checkout')}>Back to Checkout</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Thanh toán đơn hàng #{payment.order_id}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {payment.method === 'mock_qr' || payment.method === 'vietqr' ? (
            <>
              <div className="text-center">
                <p className="mb-4">Quét mã QR để thanh toán</p>
                {payment.payment_url && (
                  <div className="flex justify-center p-4 bg-white rounded-lg">
                    <QRCodeSVG
                      value={payment.payment_url}
                      size={300}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                )}
                <p className="mt-4 text-sm text-gray-500">
                  Hoặc mở link: <a href={payment.payment_url || '#'} className="text-blue-600 underline" target="_blank">{payment.payment_url}</a>
                </p>
                {payment.expires_at && (
                  <p className="mt-2 text-sm text-gray-500">
                    Hết hạn: {new Date(payment.expires_at).toLocaleString('vi-VN')}
                  </p>
                )}
                {polling && (
                  <p className="mt-4 text-sm text-blue-600">Đang kiểm tra trạng thái thanh toán...</p>
                )}
              </div>
            </>
          ) : payment.method === 'vnpay' ? (
            <div className="text-center">
              <p>Đang chuyển hướng đến VNPay...</p>
            </div>
          ) : (
            <div className="text-center">
              <p>Phương thức thanh toán không hợp lệ</p>
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={() => router.push('/checkout')}>
              Quay lại
            </Button>
            <Button onClick={checkPaymentStatus}>
              Kiểm tra trạng thái
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

