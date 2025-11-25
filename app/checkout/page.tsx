'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { tokenStore } from '@/lib/tokenStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface CartItem {
  item_id: number
  variant_id: number
  quantity: number
  product_name: string
  size_name: string
  list_price: number
  image_url: string
}

interface Address {
  address_id: number
  receiver_name: string
  phone: string
  address_line: string
  ward: string
  district: string
  province: string
}

interface ShippingMethod {
  shipping_method_id: number
  name: string
  fee: number
  estimated_days: number
}

export default function CheckoutPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [addresses, setAddresses] = useState<Address[]>([{
    address_id: 0,
    receiver_name: '',
    phone: '',
    address_line: '',
    ward: '',
    district: '',
    province: ''
  }])
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [selectedShippingId, setSelectedShippingId] = useState<number | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  const [note, setNote] = useState('')
  const [subtotal, setSubtotal] = useState(0)
  const [shippingFee, setShippingFee] = useState(0)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadCheckoutData()
  }, [])

  useEffect(() => {
    if (selectedShippingId) {
      const method = shippingMethods.find(m => m.shipping_method_id === selectedShippingId)
      setShippingFee(method?.fee || 0)
    }
  }, [selectedShippingId, shippingMethods])

  useEffect(() => {
    setTotal(subtotal + shippingFee)
  }, [subtotal, shippingFee])

  const loadCheckoutData = async () => {
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
        toast.error('Vui lòng đăng nhập để thanh toán')
        router.push('/login')
        return
      }

      // Load cart
      const cartRes = await fetch('/api/backend/v1/cart', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const cartData = await cartRes.json()
      if (cartData.success) {
        setCartItems(cartData.data.items || [])
        setSubtotal(cartData.data.subtotal || 0)
      }

      // Load addresses (using customer API)
      const customerRes = await fetch('/api/backend/v1/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const customerData = await customerRes.json()
      if (customerData.success && customerData.data?.customer_id) {
        // Update existing address with customer info
        setAddresses(prev => {
          const newAddresses = [...prev]
          if (newAddresses[0]) {
            newAddresses[0].receiver_name = customerData.data.name || ''
            newAddresses[0].phone = customerData.data.phone || ''
            newAddresses[0].address_id = 1
          } else {
            newAddresses[0] = {
              address_id: 1,
              receiver_name: customerData.data.name || '',
              phone: customerData.data.phone || '',
              address_line: '',
              ward: '',
              district: '',
              province: ''
            }
          }
          return newAddresses
        })
        setSelectedAddressId(1)
      }

      // Load shipping methods (only active ones)
      const shippingRes = await fetch('/api/backend/v1/shipping?active=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const shippingData = await shippingRes.json()
      console.log('Shipping methods response:', shippingData)
      if (shippingData.success && shippingData.data) {
        // Filter only active methods and ensure data is an array
        const methods = Array.isArray(shippingData.data) 
          ? shippingData.data.filter((m: any) => m.is_active === 1 || m.is_active === true)
          : []
        setShippingMethods(methods)
        if (methods.length > 0) {
          setSelectedShippingId(methods[0].shipping_method_id)
        }
      } else {
        console.error('Failed to load shipping methods:', shippingData)
        toast.error('Không thể tải phương thức vận chuyển')
      }
    } catch (error) {
      console.error('Error loading checkout data:', error)
      toast.error('Failed to load checkout data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    // Validate address fields
    const address = addresses[0]
    if (!address || 
        !address.receiver_name?.trim() || 
        !address.phone?.trim() || 
        !address.address_line?.trim() || 
        !address.ward?.trim() || 
        !address.district?.trim() || 
        !address.province?.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin địa chỉ giao hàng')
      return
    }

    if (!selectedShippingId) {
      toast.error('Vui lòng chọn phương thức vận chuyển')
      return
    }

    if (!selectedPaymentMethod) {
      toast.error('Vui lòng chọn phương thức thanh toán')
      return
    }

    if (cartItems.length === 0) {
      toast.error('Giỏ hàng trống')
      return
    }

    try {
      setSubmitting(true)
      let token = tokenStore.getAccessToken()
      
      // Try to refresh token if expired
      if (token && tokenStore.isTokenExpired()) {
        try {
          const newTokenData = await tokenStore.refreshToken()
          token = newTokenData.token
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError)
          toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại')
          router.push('/login')
          return
        }
      }
      
      if (!token) {
        toast.error('Vui lòng đăng nhập để thanh toán')
        router.push('/login')
        return
      }
      
      const customerData = await fetch('/api/backend/v1/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json())

      if (!customerData.success || !customerData.data?.customer_id) {
        toast.error('Không tìm thấy thông tin khách hàng')
        return
      }

      // Prepare address data for order
      // If address_id is 0, null, or 1 (default), send address data to backend to create it
      let addressId = selectedAddressId || address.address_id
      
      // Create order with address data
      // Backend will create address if address_id is 0/1 and address data is provided
      const orderData: any = {
        customer_id: customerData.data.customer_id,
        shipping_method_id: selectedShippingId,
        payment_method: selectedPaymentMethod,
        items: cartItems.map(item => ({
          variant_id: item.variant_id,
          quantity: item.quantity
        })),
        note: note
      }
      
      // If address_id is valid and > 1, use it
      // Otherwise, send address data for backend to create
      if (addressId && addressId > 1) {
        orderData.address_id = addressId
      } else {
        // Send address data so backend can create it
        orderData.address_id = 1 // Temporary, backend will create new one
        orderData.address = {
          receiver_name: address.receiver_name,
          phone: address.phone,
          address_line: address.address_line,
          ward: address.ward,
          district: address.district,
          province: address.province
        }
      }

      const orderRes = await fetch('/api/backend/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      })

      const orderResult = await orderRes.json()
      
      // Debug: Log response
      console.log('Order creation response:', orderResult)
      if (orderResult.debug) {
        console.log('Debug info:', orderResult.debug)
      }

      if (orderResult.success) {
        const order = orderResult.data
        const paymentId = order.payment_id

        if (paymentId) {
          // Redirect to payment page
          router.push(`/checkout/payment/${paymentId}`)
        } else if (selectedPaymentMethod === 'cod') {
          // COD - redirect to success
          router.push('/checkout/payment/success?order_id=' + order.order_id)
        } else {
          toast.error('Không tìm thấy thông tin thanh toán')
        }
      } else {
        toast.error(orderResult.message || 'Failed to create order')
      }
    } catch (error) {
      console.error('Error creating order:', error)
      toast.error('Failed to create order')
    } finally {
      setSubmitting(false)
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
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">Thanh toán</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column - Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Address Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Địa chỉ giao hàng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  placeholder="Tên người nhận"
                  value={addresses[0]?.receiver_name || ''}
                  onChange={(e) => {
                    setAddresses(prev => {
                      const newAddresses = [...prev]
                      if (!newAddresses[0]) {
                        newAddresses[0] = {
                          address_id: 1,
                          receiver_name: '',
                          phone: '',
                          address_line: '',
                          ward: '',
                          district: '',
                          province: ''
                        }
                      }
                      newAddresses[0].receiver_name = e.target.value
                      // Auto-set selectedAddressId when address is being filled
                      if (!selectedAddressId) {
                        setSelectedAddressId(newAddresses[0].address_id || 1)
                      }
                      return newAddresses
                    })
                  }}
                />
                <Input
                  placeholder="Số điện thoại"
                  value={addresses[0]?.phone || ''}
                  onChange={(e) => {
                    setAddresses(prev => {
                      const newAddresses = [...prev]
                      if (!newAddresses[0]) {
                        newAddresses[0] = {
                          address_id: 0,
                          receiver_name: '',
                          phone: '',
                          address_line: '',
                          ward: '',
                          district: '',
                          province: ''
                        }
                      }
                      newAddresses[0].phone = e.target.value
                      return newAddresses
                    })
                  }}
                />
                <Input
                  placeholder="Địa chỉ"
                  value={addresses[0]?.address_line || ''}
                  onChange={(e) => {
                    setAddresses(prev => {
                      const newAddresses = [...prev]
                      if (!newAddresses[0]) {
                        newAddresses[0] = {
                          address_id: 0,
                          receiver_name: '',
                          phone: '',
                          address_line: '',
                          ward: '',
                          district: '',
                          province: ''
                        }
                      }
                      newAddresses[0].address_line = e.target.value
                      return newAddresses
                    })
                  }}
                />
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    placeholder="Phường/Xã"
                    value={addresses[0]?.ward || ''}
                    onChange={(e) => {
                      setAddresses(prev => {
                        const newAddresses = [...prev]
                        if (!newAddresses[0]) {
                          newAddresses[0] = {
                            address_id: 0,
                            receiver_name: '',
                            phone: '',
                            address_line: '',
                            ward: '',
                            district: '',
                            province: ''
                          }
                        }
                        newAddresses[0].ward = e.target.value
                        return newAddresses
                      })
                    }}
                  />
                  <Input
                    placeholder="Quận/Huyện"
                    value={addresses[0]?.district || ''}
                    onChange={(e) => {
                      setAddresses(prev => {
                        const newAddresses = [...prev]
                        if (!newAddresses[0]) {
                          newAddresses[0] = {
                            address_id: 0,
                            receiver_name: '',
                            phone: '',
                            address_line: '',
                            ward: '',
                            district: '',
                            province: ''
                          }
                        }
                        newAddresses[0].district = e.target.value
                        return newAddresses
                      })
                    }}
                  />
                  <Input
                    placeholder="Tỉnh/Thành phố"
                    value={addresses[0]?.province || ''}
                    onChange={(e) => {
                      setAddresses(prev => {
                        const newAddresses = [...prev]
                        if (!newAddresses[0]) {
                          newAddresses[0] = {
                            address_id: 0,
                            receiver_name: '',
                            phone: '',
                            address_line: '',
                            ward: '',
                            district: '',
                            province: ''
                          }
                        }
                        newAddresses[0].province = e.target.value
                        return newAddresses
                      })
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Method */}
          <Card>
            <CardHeader>
              <CardTitle>Phương thức vận chuyển</CardTitle>
            </CardHeader>
            <CardContent>
              {shippingMethods.length === 0 ? (
                <p className="text-gray-500 text-sm">Không có phương thức vận chuyển nào. Vui lòng thử lại sau.</p>
              ) : (
                <RadioGroup value={selectedShippingId?.toString()} onValueChange={(v) => setSelectedShippingId(parseInt(v))}>
                  {shippingMethods.map((method) => (
                    <div key={method.shipping_method_id} className="flex items-center space-x-2 border rounded p-4 mb-2">
                      <RadioGroupItem value={method.shipping_method_id.toString()} id={`shipping-${method.shipping_method_id}`} />
                      <Label htmlFor={`shipping-${method.shipping_method_id}`} className="flex-1 cursor-pointer">
                        <div className="flex justify-between">
                          <span>{method.name}</span>
                          <span className="font-semibold">{method.fee.toLocaleString('vi-VN')} ₫</span>
                        </div>
                        <p className="text-sm text-gray-500">Giao hàng trong {method.estimated_days} ngày</p>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle>Phương thức thanh toán</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 border rounded p-4">
                    <RadioGroupItem value="mock_qr" id="payment-mock_qr" />
                    <Label htmlFor="payment-mock_qr" className="flex-1 cursor-pointer">
                      Mock Payment QR
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded p-4">
                    <RadioGroupItem value="vietqr" id="payment-vietqr" />
                    <Label htmlFor="payment-vietqr" className="flex-1 cursor-pointer">
                      VietQR Bank Mock
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded p-4">
                    <RadioGroupItem value="vnpay" id="payment-vnpay" />
                    <Label htmlFor="payment-vnpay" className="flex-1 cursor-pointer">
                      VNPay
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded p-4">
                    <RadioGroupItem value="cod" id="payment-cod" />
                    <Label htmlFor="payment-cod" className="flex-1 cursor-pointer">
                      COD (Thanh toán khi nhận hàng)
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Note */}
          <Card>
            <CardHeader>
              <CardTitle>Ghi chú</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Ghi chú cho đơn hàng (tùy chọn)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Tóm tắt đơn hàng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {cartItems.map((item) => (
                  <div key={item.item_id} className="flex justify-between text-sm">
                    <span>{item.product_name} ({item.size_name}) x{item.quantity}</span>
                    <span>{(item.list_price * item.quantity).toLocaleString('vi-VN')} ₫</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span>{subtotal.toLocaleString('vi-VN')} ₫</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí vận chuyển:</span>
                  <span>{shippingFee.toLocaleString('vi-VN')} ₫</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Tổng cộng:</span>
                  <span>{total.toLocaleString('vi-VN')} ₫</span>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={submitting || !selectedPaymentMethod}
              >
                {submitting ? 'Đang xử lý...' : 'Đặt hàng'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

