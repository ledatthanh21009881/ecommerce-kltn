'use client'

import { useState, useEffect, useCallback } from 'react'
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
  qr_code?: string | null
  expires_at: string | null
  order?: {
    order_id: number
    total_amount: number
    status: string
    items?: any[]
  } | null
}

function debugIngest(payload: unknown) {
  // Opt-in only. If not set, do nothing (prevents production spam/ERR_CONNECTION_REFUSED).
  const baseUrl = process.env.NEXT_PUBLIC_DEBUG_INGEST_URL
  const ingestId = process.env.NEXT_PUBLIC_DEBUG_INGEST_ID
  if (!baseUrl || !ingestId) return

  try {
    const url = `${baseUrl.replace(/\/+$/, '')}/ingest/${ingestId}`
    const body = JSON.stringify(payload)

    // Prefer sendBeacon (non-blocking) when available.
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
      return
    }

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Never break UX because of debug logging.
  }
}

export default function PaymentPage() {
  const router = useRouter()
  const params = useParams()
  const paymentId = params?.paymentId as string
  const [payment, setPayment] = useState<PaymentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [polling, setPolling] = useState(false)
  const [autoCheckCountdown, setAutoCheckCountdown] = useState(30) // 30 seconds before auto-check
  const [countdown, setCountdown] = useState(600) // 10 minutes

  // Define checkPaymentStatus before it's used in useEffect
  const checkPaymentStatus = useCallback(async () => {
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

      // Check if response is OK
      if (!response.ok) {
        const text = await response.text()
        console.error('Payment status check error:', response.status, text.substring(0, 200))
        return
      }

      // Check content type
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Payment status check returned non-JSON:', contentType, text.substring(0, 200))
        return
      }

      const data = await response.json()
      if (data.success && data.data.status === 'confirmed') {
        setPolling(false)
        router.push(`/checkout/payment/success?order_id=${data.data.order_id}`)
      } else if (data.success) {
        // Update payment data even if not confirmed
        setPayment(data.data)
      }
    } catch (error) {
      console.error('Error checking payment status:', error)
    }
  }, [paymentId, router])

  const loadPayment = useCallback(async () => {
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

      // Check if response is OK
      if (!response.ok) {
        const text = await response.text()
        console.error('Payment status API error:', response.status, text.substring(0, 200))
        toast.error(`Failed to load payment: HTTP ${response.status}`)
        setLoading(false)
        return
      }

      // Check content type
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Payment status API returned non-JSON:', contentType, text.substring(0, 200))
        toast.error('Server returned invalid response')
        setLoading(false)
        return
      }

      const data = await response.json()
      if (data.success) {
        debugIngest({
          event: 'payment.loadPayment.success',
          location: 'web/app/checkout/payment/[paymentId]/page.tsx',
          paymentId,
          data: {
            method: data?.data?.method,
            status: data?.data?.status,
            order_id: data?.data?.order_id,
            has_payment_url: !!data?.data?.payment_url,
            has_qr_code: !!data?.data?.qr_code,
          },
          timestamp: Date.now(),
        })
        setPayment(data.data)
        
        // If COD or already confirmed, redirect to success
        if (data.data.method === 'cod' || data.data.status === 'confirmed') {
          debugIngest({
            event: 'payment.redirect.success',
            location: 'web/app/checkout/payment/[paymentId]/page.tsx',
            paymentId,
            data: {
              method: data?.data?.method,
              status: data?.data?.status,
              order_id: data?.data?.order_id,
            },
            timestamp: Date.now(),
          })
          router.push(`/checkout/payment/success?order_id=${data.data.order_id}`)
        }
        // If VNPay, redirect to payment URL
        else if (data.data.method === 'vnpay' && data.data.payment_url) {
          debugIngest({
            event: 'payment.redirect.vnpay',
            location: 'web/app/checkout/payment/[paymentId]/page.tsx',
            paymentId,
            data: { has_payment_url: !!data?.data?.payment_url },
            timestamp: Date.now(),
          })
          window.location.href = data.data.payment_url
        }
        // If PayOS, redirect to payment URL (auto-redirect like VNPay)
        else if (data.data.method === 'payos' && data.data.payment_url) {
          window.location.href = data.data.payment_url
        }
      } else {
        toast.error(data.message || 'Failed to load payment')
      }
    } catch (error) {
      console.error('Error loading payment:', error)
      toast.error('Failed to load payment: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [paymentId, router])

  useEffect(() => {
    if (paymentId) {
      loadPayment()
    }
  }, [paymentId, loadPayment])

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Auto-check countdown and polling (giống Restaurant Management)
  useEffect(() => {
    if (payment && payment.status === 'pending' && (payment.method === 'vietqr' || payment.method === 'mock_qr' || payment.method === 'payos')) {
      console.log('🔄 [Payment] Starting auto-check countdown for payment:', paymentId)
      
      let pollInterval: NodeJS.Timeout | null = null
      
      // Countdown timer: đợi 30 giây trước khi bắt đầu polling
      const countdownTimer = setInterval(() => {
        setAutoCheckCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimer)
            console.log('🔄 [Payment] Countdown finished, starting auto-polling every 5 seconds...')
            
            // Bắt đầu polling mỗi 5 giây sau khi countdown kết thúc
            pollInterval = setInterval(() => {
              console.log('🔄 [Payment] Auto-checking payment status...')
              checkPaymentStatus()
            }, 5000) // Poll every 5 seconds (thay vì 3 giây)
            
            setPolling(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => {
        clearInterval(countdownTimer)
        if (pollInterval) {
          clearInterval(pollInterval)
        }
      }
    }
  }, [payment, paymentId, checkPaymentStatus])

  // WebSocket connection for real-time payment updates (optional - disabled by default)
  useEffect(() => {
    if (!paymentId || !payment) return

    // Only connect for pending payments
    if (payment.status !== 'pending') return

    // Check if WebSocket is enabled (disable by default to avoid retry loops)
    const enableWebSocket = process.env.NEXT_PUBLIC_ENABLE_WS === 'true'
    if (!enableWebSocket) {
      // WebSocket disabled, rely on polling only
      return
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsHost = process.env.NEXT_PUBLIC_WS_URL || 'localhost:8080'
    const wsUrl = `${wsProtocol}//${wsHost}`

    console.log('Connecting to WebSocket for payment updates:', wsUrl)
    let ws: WebSocket | null = null
    let reconnectAttempts = 0
    const maxReconnectAttempts = 2 // Only try 2 times
    let reconnectTimeout: NodeJS.Timeout | null = null
    let isMounted = true

    const connect = () => {
      if (!isMounted || payment.status !== 'pending') return

      try {
        ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          if (!isMounted) {
            ws?.close()
            return
          }
          console.log('WebSocket connected for payment updates')
          reconnectAttempts = 0 // Reset on successful connection
          // Join payment room
          ws?.send(JSON.stringify({
            type: 'join_payment',
            payment_id: parseInt(paymentId)
          }))
        }

        ws.onmessage = (event) => {
          if (!isMounted) return
          try {
            const data = JSON.parse(event.data)
            console.log('WebSocket message received:', data)

            if (data.type === 'payment_update') {
              if (data.payment_id === parseInt(paymentId)) {
                console.log('Payment update received:', data)

                // Update payment status
                if (data.status === 'confirmed') {
                  setPayment(prev => prev ? { ...prev, status: 'confirmed' } : {
                    payment_id: data.payment_id,
                    order_id: data.order_id,
                    method: data.data?.method || 'payos',
                    status: 'confirmed',
                    payment_url: null,
                    expires_at: null
                  })

                  // Show success message
                  toast.success('Thanh toán thành công!')

                  // Redirect to success page
                  setTimeout(() => {
                    router.push(`/checkout/payment/success?order_id=${data.order_id}`)
                  }, 2000)
                }
              }
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        ws.onerror = (error) => {
          // Don't log error repeatedly, just handle in onclose
        }

        ws.onclose = () => {
          if (!isMounted) return
          console.log('WebSocket disconnected')
          ws = null
          
          // Only retry if under max attempts and payment is still pending
          if (reconnectAttempts < maxReconnectAttempts && payment.status === 'pending' && isMounted) {
            reconnectAttempts++
            const delay = 5000 // 5 seconds delay
            console.log(`WebSocket will retry in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`)
            reconnectTimeout = setTimeout(() => {
              if (isMounted && payment.status === 'pending') {
                connect()
              }
            }, delay)
          } else if (reconnectAttempts >= maxReconnectAttempts) {
            console.log('WebSocket max reconnect attempts reached, using polling only')
          }
        }
      } catch (error) {
        console.error('Error creating WebSocket:', error)
      }
    }

    connect()

    return () => {
      isMounted = false
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      if (ws) {
        ws.close()
        ws = null
      }
    }
  }, [paymentId, payment?.status]) // Only re-run if payment status changes

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
          ) : payment.method === 'payos' ? (
            <>
              <div className="text-center space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    Thanh toán qua chuyển khoản ngân hàng
                  </h3>
                  <p className="text-sm text-gray-700 mb-4">
                    Quét mã QR để thanh toán hoặc chuyển khoản theo thông tin bên dưới
                  </p>
                  
                  {/* Countdown timer */}
                  <div className={`rounded-lg p-3 mb-4 ${
                    countdown < 60 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
                  }`}>
                    <div className={`font-semibold ${
                      countdown < 60 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      ⏰ Thời gian còn lại: {Math.floor(countdown / 60).toString().padStart(2, '0')}:{(countdown % 60).toString().padStart(2, '0')}
                    </div>
                    {countdown < 60 && (
                      <div className="text-xs text-red-600 mt-1">
                        Vui lòng hoàn tất thanh toán trước khi hết thời gian!
                      </div>
                    )}
                  </div>

                  {/* Auto-check countdown */}
                  {autoCheckCountdown > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <div className="text-blue-900 font-semibold text-sm">
                        🔄 Tự động kiểm tra thanh toán sau: {autoCheckCountdown} giây
                      </div>
                      <div className="text-xs text-blue-700 mt-1">
                        Hoặc click "Kiểm tra trạng thái" để kiểm tra ngay
                      </div>
                    </div>
                  )}
                  
                  {/* QR Code - Using proxy to bypass CORS */}
                  {payment.payment_url && (
                    <div className="flex flex-col items-center p-4 bg-white rounded-lg mb-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={`/api/qr-proxy?url=${encodeURIComponent(payment.payment_url)}`}
                        alt="QR Code thanh toán"
                        className="w-64 h-64 object-contain"
                        loading="eager"
                        onError={(e) => {
                          // Fallback to direct URL if proxy fails
                          console.error('Proxy failed, trying direct URL');
                          e.currentTarget.src = payment.payment_url || '';
                        }}
                      />
                      <a 
                        href={payment.payment_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-2 text-sm text-blue-600 underline"
                      >
                        Mở QR Code trong tab mới
                      </a>
                    </div>
                  )}
                  
                  {/* QR Code data (nếu API trả về data thay vì URL) */}
                  {payment.qr_code && !payment.payment_url && (
                    <div className="flex justify-center p-4 bg-white rounded-lg mb-4">
                      <QRCodeSVG
                        value={payment.qr_code}
                        size={256}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                  )}
                  
                  <div className="bg-white rounded p-4 text-left space-y-2">
                    <p className="text-sm">
                      <span className="font-semibold">Mã đơn hàng:</span> #{payment.order_id}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Nội dung chuyển khoản:</span> ORDER_{payment.order_id}
                    </p>
                    {payment.order?.total_amount && (
                      <p className="text-sm">
                        <span className="font-semibold">Số tiền:</span> {payment.order.total_amount.toLocaleString('vi-VN')} ₫
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-2">
                      Vui lòng ghi đúng nội dung chuyển khoản để hệ thống tự động xác nhận
                    </p>
                  </div>
                </div>
                {polling && (
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <p className="text-sm">Đang kiểm tra trạng thái thanh toán (tự động mỗi 5 giây)...</p>
                  </div>
                )}
                {payment.expires_at && (
                  <p className="text-sm text-gray-500">
                    Hết hạn: {new Date(payment.expires_at).toLocaleString('vi-VN')}
                  </p>
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

