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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'


function parseVndAmount(value: unknown): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(value) : 0
  }
  const s = String(value).trim().replace(/,/g, '')
  if (!s) return 0
  const n = Number(s)
  return Number.isFinite(n) ? Math.round(n) : 0
}

function formatVnd(amount: number): string {
  return (
    new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number.isFinite(amount) ? Math.round(amount) : 0) + ' ₫'
  )
}

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
  is_default?: number
}

interface ShippingMethod {
  shipping_method_id: number
  name: string
  fee: number
  estimated_days: number
}

interface Province {
  name: string
  code: number
  division_type: string
  codename: string
  phone_code: number
  districts?: District[]
}

interface District {
  name: string
  code: number
  division_type: string
  codename: string
  province_code: number
  wards?: Ward[]
}

interface Ward {
  name: string
  code: number
  division_type: string
  codename: string
  district_code: number
}

export default function CheckoutPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([])
  const [addresses, setAddresses] = useState<Address[]>([{
    address_id: 0,
    receiver_name: '',
    phone: '',
    address_line: '',
    ward: '',
    district: '',
    province: ''
  }])
  const [useNewAddress, setUseNewAddress] = useState(false)
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [selectedShippingId, setSelectedShippingId] = useState<number | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  const [note, setNote] = useState('')
  const [subtotal, setSubtotal] = useState(0)
  const [shippingFee, setShippingFee] = useState(0)
  const [total, setTotal] = useState(0)
  
  // Address dropdown states
  const [provinces, setProvinces] = useState<Province[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [wards, setWards] = useState<Ward[]>([])
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<number | null>(null)
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<number | null>(null)
  const [selectedWardCode, setSelectedWardCode] = useState<number | null>(null)
  
  // Popover open states for searchable selects
  const [provinceOpen, setProvinceOpen] = useState(false)
  const [districtOpen, setDistrictOpen] = useState(false)
  const [wardOpen, setWardOpen] = useState(false)

  useEffect(() => {
    loadCheckoutData()
    loadProvinces()
  }, [])

  useEffect(() => {
    if (selectedProvinceCode) {
      loadDistricts(selectedProvinceCode)
    } else {
      setDistricts([])
      setWards([])
      setSelectedDistrictCode(null)
      setSelectedWardCode(null)
      // Clear address fields when province is cleared
      setAddresses(prev => {
        const newAddresses = [...prev]
        if (newAddresses[0]) {
          newAddresses[0].district = ''
          newAddresses[0].ward = ''
        }
        return newAddresses
      })
    }
  }, [selectedProvinceCode])

  useEffect(() => {
    if (selectedDistrictCode) {
      loadWards(selectedDistrictCode)
    } else {
      setWards([])
      setSelectedWardCode(null)
      // Clear ward field when district is cleared
      setAddresses(prev => {
        const newAddresses = [...prev]
        if (newAddresses[0]) {
          newAddresses[0].ward = ''
        }
        return newAddresses
      })
    }
  }, [selectedDistrictCode])

  useEffect(() => {
    if (selectedShippingId) {
      const method = shippingMethods.find(m => m.shipping_method_id === selectedShippingId)
      setShippingFee(parseVndAmount(method?.fee))
    }
  }, [selectedShippingId, shippingMethods])

  useEffect(() => {
    setTotal(parseVndAmount(subtotal) + parseVndAmount(shippingFee))
  }, [subtotal, shippingFee])

  const loadProvinces = async () => {
    try {
      const response = await fetch('https://provinces.open-api.vn/api/p/')
      if (response.ok) {
        const data: Province[] = await response.json()
        setProvinces(data)
      } else {
        console.error('Failed to load provinces')
        toast.error('Không thể tải danh sách tỉnh/thành phố')
      }
    } catch (error) {
      console.error('Error loading provinces:', error)
      toast.error('Lỗi khi tải danh sách tỉnh/thành phố')
    }
  }

  const loadDistricts = async (provinceCode: number) => {
    try {
      const response = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`)
      if (response.ok) {
        const province: Province = await response.json()
        if (province.districts) {
          setDistricts(province.districts)
        } else {
          // Fallback: try alternative endpoint
          const altResponse = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}`)
          if (altResponse.ok) {
            const altProvince: Province = await altResponse.json()
            setDistricts(altProvince.districts || [])
          } else {
            setDistricts([])
          }
        }
      } else {
        console.error('Failed to load districts')
        setDistricts([])
      }
    } catch (error) {
      console.error('Error loading districts:', error)
      setDistricts([])
    }
  }

  const loadWards = async (districtCode: number) => {
    try {
      const response = await fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`)
      if (response.ok) {
        const district: District = await response.json()
        if (district.wards) {
          setWards(district.wards)
        } else {
          // Fallback: try alternative endpoint
          const altResponse = await fetch(`https://provinces.open-api.vn/api/d/${districtCode}`)
          if (altResponse.ok) {
            const altDistrict: District = await altResponse.json()
            setWards(altDistrict.wards || [])
          } else {
            setWards([])
          }
        }
      } else {
        console.error('Failed to load wards')
        setWards([])
      }
    } catch (error) {
      console.error('Error loading wards:', error)
      setWards([])
    }
  }

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
        const rawItems = (cartData.data.items || []) as CartItem[]
        setCartItems(
          rawItems.map((it) => ({
            ...it,
            list_price: parseVndAmount(it.list_price as unknown),
            quantity: typeof it.quantity === 'number' && Number.isFinite(it.quantity) ? it.quantity : Number(it.quantity) || 0,
          })),
        )
        setSubtotal(parseVndAmount(cartData.data.subtotal))
      }

      // Load customer info and saved addresses
      const customerRes = await fetch('/api/backend/v1/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const customerData = await customerRes.json()
      if (customerData.success && customerData.data?.customer_id) {
        setAddresses(prev => {
          const newAddresses = [...prev]
          if (newAddresses[0]) {
            newAddresses[0].receiver_name = customerData.data.name || ''
            newAddresses[0].phone = customerData.data.phone || ''
          } else {
            newAddresses[0] = {
              address_id: 0,
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
      }

      const addrRes = await fetch('/api/backend/v1/user/addresses', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const addrData = await addrRes.json()
      if (addrData.success && Array.isArray(addrData.data) && addrData.data.length > 0) {
        setSavedAddresses(addrData.data)
        const defaultAddr = addrData.data.find((a: Address) => a.is_default) || addrData.data[0]
        setSelectedAddressId(defaultAddr.address_id)
        setUseNewAddress(false)
      } else {
        setSavedAddresses([])
        setSelectedAddressId(null)
        setUseNewAddress(true)
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
    const useAddressForm = useNewAddress || savedAddresses.length === 0
    const address = addresses[0]
    if (useAddressForm) {
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

      if (useAddressForm) {
        orderData.address = {
          receiver_name: address!.receiver_name,
          phone: address!.phone,
          address_line: address!.address_line,
          ward: address!.ward,
          district: address!.district,
          province: address!.province
        }
      } else if (selectedAddressId && selectedAddressId > 0) {
        orderData.address_id = selectedAddressId
      }
      // else: backend will use default address

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
                {savedAddresses.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Chọn địa chỉ có sẵn hoặc nhập mới</Label>
                    <RadioGroup
                      value={useNewAddress ? 'new' : String(selectedAddressId ?? '')}
                      onValueChange={(v) => {
                        if (v === 'new') {
                          setUseNewAddress(true)
                          setSelectedAddressId(null)
                        } else {
                          setUseNewAddress(false)
                          setSelectedAddressId(Number(v))
                        }
                      }}
                      className="space-y-2"
                    >
                      {savedAddresses.map((addr) => (
                        <div key={addr.address_id} className="flex items-start gap-3 rounded-lg border p-3">
                          <RadioGroupItem value={String(addr.address_id)} id={`addr-${addr.address_id}`} />
                          <Label htmlFor={`addr-${addr.address_id}`} className="flex-1 cursor-pointer text-sm">
                            <span className="font-medium">{addr.receiver_name}</span>
                            {addr.is_default ? <span className="ml-2 text-xs text-muted-foreground">(Mặc định)</span> : null}
                            <p className="text-muted-foreground">{addr.phone}</p>
                            <p className="text-muted-foreground">{addr.address_line}, {[addr.ward, addr.district, addr.province].filter(Boolean).join(', ')}</p>
                          </Label>
                        </div>
                      ))}
                      <div className="flex items-start gap-3 rounded-lg border p-3">
                        <RadioGroupItem value="new" id="addr-new" />
                        <Label htmlFor="addr-new" className="flex-1 cursor-pointer text-sm font-medium">
                          Giao đến địa chỉ khác (nhập mới)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {(!savedAddresses.length || useNewAddress) && (
                  <>
                    <Label className="text-sm">Thông tin địa chỉ giao hàng</Label>
                    <Input
                      placeholder="Tên người nhận"
                      value={addresses[0]?.receiver_name || ''}
                      onChange={(e) => {
                        setAddresses(prev => {
                          const newAddresses = [...prev]
                          if (!newAddresses[0]) {
                            newAddresses[0] = { address_id: 0, receiver_name: '', phone: '', address_line: '', ward: '', district: '', province: '' }
                          }
                          newAddresses[0].receiver_name = e.target.value
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
                            newAddresses[0] = { address_id: 0, receiver_name: '', phone: '', address_line: '', ward: '', district: '', province: '' }
                          }
                          newAddresses[0].phone = e.target.value
                          return newAddresses
                        })
                      }}
                    />
                    <Input
                      placeholder="Số nhà, tên đường"
                      value={addresses[0]?.address_line || ''}
                      onChange={(e) => {
                        setAddresses(prev => {
                          const newAddresses = [...prev]
                          if (!newAddresses[0]) {
                            newAddresses[0] = { address_id: 0, receiver_name: '', phone: '', address_line: '', ward: '', district: '', province: '' }
                          }
                          newAddresses[0].address_line = e.target.value
                          return newAddresses
                        })
                      }}
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm mb-2 block">Tỉnh/Thành phố</Label>
                    <Popover open={provinceOpen} onOpenChange={setProvinceOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={provinceOpen}
                          className="w-full justify-between"
                        >
                          {selectedProvinceCode
                            ? provinces.find((p) => p.code === selectedProvinceCode)?.name
                            : "Chọn Tỉnh/Thành phố"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Tìm kiếm tỉnh/thành phố..." />
                          <CommandList>
                            <CommandEmpty>Không tìm thấy.</CommandEmpty>
                            <CommandGroup>
                              {provinces.map((province) => (
                                <CommandItem
                                  key={province.code}
                                  value={province.name}
                                  onSelect={() => {
                                    setSelectedProvinceCode(province.code)
                                    setProvinceOpen(false)
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
                                      newAddresses[0].province = province.name
                                      return newAddresses
                                    })
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedProvinceCode === province.code ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {province.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block">Quận/Huyện</Label>
                    <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={districtOpen}
                          className="w-full justify-between"
                          disabled={!selectedProvinceCode || districts.length === 0}
                        >
                          {selectedDistrictCode
                            ? districts.find((d) => d.code === selectedDistrictCode)?.name
                            : "Chọn Quận/Huyện"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Tìm kiếm quận/huyện..." />
                          <CommandList>
                            <CommandEmpty>Không tìm thấy.</CommandEmpty>
                            <CommandGroup>
                              {districts.map((district) => (
                                <CommandItem
                                  key={district.code}
                                  value={district.name}
                                  onSelect={() => {
                                    setSelectedDistrictCode(district.code)
                                    setDistrictOpen(false)
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
                                      newAddresses[0].district = district.name
                                      return newAddresses
                                    })
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedDistrictCode === district.code ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {district.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="text-sm mb-2 block">Phường/Xã</Label>
                    <Popover open={wardOpen} onOpenChange={setWardOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={wardOpen}
                          className="w-full justify-between"
                          disabled={!selectedDistrictCode || wards.length === 0}
                        >
                          {selectedWardCode
                            ? wards.find((w) => w.code === selectedWardCode)?.name
                            : "Chọn Phường/Xã"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Tìm kiếm phường/xã..." />
                          <CommandList>
                            <CommandEmpty>Không tìm thấy.</CommandEmpty>
                            <CommandGroup>
                              {wards.map((ward) => (
                                <CommandItem
                                  key={ward.code}
                                  value={ward.name}
                                  onSelect={() => {
                                    setSelectedWardCode(ward.code)
                                    setWardOpen(false)
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
                                      newAddresses[0].ward = ward.name
                                      return newAddresses
                                    })
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedWardCode === ward.code ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {ward.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                      </div>
                    </div>
                  </>
                )}
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
                          <span className="font-semibold">{formatVnd(method.fee)}</span>
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
                    <RadioGroupItem value="cod" id="payment-cod" />
                    <Label htmlFor="payment-cod" className="flex-1 cursor-pointer">
                      COD (Thanh toán khi nhận hàng)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded p-4">
                    <RadioGroupItem value="payos" id="payment-payos" />
                    <Label htmlFor="payment-payos" className="flex-1 cursor-pointer">
                      Chuyển khoản ngân hàng
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
                    <span>{formatVnd(item.list_price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span>{formatVnd(parseVndAmount(subtotal))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phí vận chuyển:</span>
                  <span>{formatVnd(parseVndAmount(shippingFee))}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Tổng cộng:</span>
                  <span>{formatVnd(parseVndAmount(total))}</span>
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

