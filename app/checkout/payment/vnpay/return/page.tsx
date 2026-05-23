'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'

function VNPayReturnFallback() {
  const { t } = useLanguage()
  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">{t('vnpay.processing')}</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
        </CardContent>
      </Card>
    </div>
  )
}

function VNPayReturnContent() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading')
  const [orderId, setOrderId] = useState<number | null>(null)

  useEffect(() => {
    const vnp_ResponseCode = searchParams.get('vnp_ResponseCode')
    const vnp_TxnRef = searchParams.get('vnp_TxnRef')

    if (vnp_ResponseCode === '00') {
      setStatus('success')
      if (vnp_TxnRef) {
        const parts = vnp_TxnRef.split('_')
        if (parts.length >= 2) {
          setOrderId(parseInt(parts[1], 10))
        }
      }
    } else {
      setStatus('failed')
    }
  }, [searchParams])

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            {status === 'loading' && t('vnpay.processing')}
            {status === 'success' && t('vnpay.successTitle')}
            {status === 'failed' && t('vnpay.failedTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          {status === 'success' && (
            <>
              <div className="flex justify-center">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
              <p className="text-lg">{t('vnpay.thanks')}</p>
              {orderId && (
                <p className="text-sm text-gray-500">
                  {t('vnpay.orderLabel', { id: String(orderId) })}
                </p>
              )}
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() =>
                    router.push(`/checkout/payment/success?order_id=${orderId}`)
                  }
                >
                  {t('vnpay.viewOrder')}
                </Button>
                <Button variant="outline" onClick={() => router.push('/')}>
                  {t('vnpay.home')}
                </Button>
              </div>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="flex justify-center">
                <XCircle className="h-16 w-16 text-red-500" />
              </div>
              <p className="text-lg">{t('vnpay.failedMessage')}</p>
              <p className="text-sm text-gray-500">{t('vnpay.retryHint')}</p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => router.push('/checkout')}>{t('vnpay.retry')}</Button>
                <Button variant="outline" onClick={() => router.push('/')}>
                  {t('vnpay.home')}
                </Button>
              </div>
            </>
          )}

          {status === 'loading' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function VNPayReturnPage() {
  return (
    <Suspense fallback={<VNPayReturnFallback />}>
      <VNPayReturnContent />
    </Suspense>
  )
}
