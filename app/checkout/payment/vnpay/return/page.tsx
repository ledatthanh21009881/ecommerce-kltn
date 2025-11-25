'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle } from 'lucide-react'

export default function VNPayReturnPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading')
  const [orderId, setOrderId] = useState<number | null>(null)

  useEffect(() => {
    const vnp_ResponseCode = searchParams.get('vnp_ResponseCode')
    const vnp_TxnRef = searchParams.get('vnp_TxnRef')

    if (vnp_ResponseCode === '00') {
      // Success
      setStatus('success')
      // Extract order_id from transaction ref
      if (vnp_TxnRef) {
        const parts = vnp_TxnRef.split('_')
        if (parts.length >= 2) {
          setOrderId(parseInt(parts[1]))
        }
      }
    } else {
      // Failed
      setStatus('failed')
    }
  }, [searchParams])

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            {status === 'loading' && 'Đang xử lý...'}
            {status === 'success' && 'Thanh toán thành công!'}
            {status === 'failed' && 'Thanh toán thất bại'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          {status === 'success' && (
            <>
              <div className="flex justify-center">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
              <p className="text-lg">Cảm ơn bạn đã thanh toán!</p>
              {orderId && (
                <p className="text-sm text-gray-500">Đơn hàng #{orderId}</p>
              )}
              <div className="flex gap-4 justify-center">
                <Button onClick={() => router.push(`/checkout/payment/success?order_id=${orderId}`)}>
                  Xem đơn hàng
                </Button>
                <Button variant="outline" onClick={() => router.push('/')}>
                  Về trang chủ
                </Button>
              </div>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="flex justify-center">
                <XCircle className="h-16 w-16 text-red-500" />
              </div>
              <p className="text-lg">Thanh toán không thành công</p>
              <p className="text-sm text-gray-500">
                Vui lòng thử lại hoặc chọn phương thức thanh toán khác
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => router.push('/checkout')}>
                  Thử lại
                </Button>
                <Button variant="outline" onClick={() => router.push('/')}>
                  Về trang chủ
                </Button>
              </div>
            </>
          )}

          {status === 'loading' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

