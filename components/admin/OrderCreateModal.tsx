'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Minus, Trash2, ChevronsUpDown, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { getAuthData } from '@/lib/admin-auth'
import { useLanguage } from '@/contexts/LanguageContext'

interface ShippingMethod {
  shipping_method_id: number
  name: string
  fee: number
  is_active: boolean
}

interface ProductVariant {
  variant_id: number
  product_id: number
  product_name: string
  size_name: string
  sku: string
  list_price?: number | string
}

/** Người dùng từ users + accounts (role customer), giống trang Quản lý người dùng */
interface CustomerOption {
  user_id: number
  account_name?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
}

interface OrderItemForm {
  product_id: number
  variant_id: number
  quantity: number
}

interface CustomerAddress {
  address_id: number
  user_id: number
  receiver_name?: string
  phone?: string
  address_line?: string
  ward?: string
  district?: string
  province?: string
  is_default?: number
}

interface OrderCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

const DEFAULT_ITEM: OrderItemForm = { product_id: 0, variant_id: 0, quantity: 1 }

function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(amount)} VND`
}

function formatCustomerLabel(customer: CustomerOption): string {
  const displayName = `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim()
  if (customer.account_name != null && customer.account_name !== '') {
    return `#${customer.user_id} · ${customer.account_name} · ${displayName || customer.email || customer.phone || '—'}`
  }
  return `#${customer.user_id} - ${displayName || customer.email || customer.phone || '—'}`
}

function formatAddressOption(a: CustomerAddress): string {
  const line = [a.address_line, a.ward, a.district, a.province].filter(Boolean).join(', ')
  const who = [a.receiver_name, a.phone].filter(Boolean).join(' · ')
  if (who && line) return `${who} — ${line}`
  return line || who || `#${a.address_id}`
}

export default function OrderCreateModal({ isOpen, onClose, onCreated }: OrderCreateModalProps) {
  const { t } = useLanguage()
  const [loadingData, setLoadingData] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([])
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [customerComboboxOpen, setCustomerComboboxOpen] = useState(false)
  const [shippingMethodId, setShippingMethodId] = useState('')
  const [addressId, setAddressId] = useState('')
  const [customerAddresses, setCustomerAddresses] = useState<CustomerAddress[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [note, setNote] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const [items, setItems] = useState<OrderItemForm[]>([{ ...DEFAULT_ITEM }])

  const ensureArray = (data: unknown): any[] => {
    if (Array.isArray(data)) return data
    if (data && typeof data === 'object' && Array.isArray((data as any).items)) return (data as any).items
    if (data && typeof data === 'object' && Array.isArray((data as any).data)) return (data as any).data
    return []
  }

  const resetForm = () => {
    setSelectedCustomerId('')
    setCustomerComboboxOpen(false)
    setShippingMethodId('')
    setAddressId('')
    setCustomerAddresses([])
    setLoadingAddresses(false)
    setPaymentMethod('cod')
    setNote('')
    setInternalNote('')
    setItems([{ ...DEFAULT_ITEM }])
  }

  useEffect(() => {
    if (!isOpen) return

    resetForm()
    setLoadingData(true)

    const fetchReferences = async () => {
      try {
        const { token } = getAuthData()
        const authHeaders = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        }

        const [usersRes, shippingRes, variantsRes] = await Promise.all([
          // Danh sách tài khoản khách (users + accounts), không dùng /customers (bảng customers có thể trống)
          fetch('/api/backend/v1/users?limit=200&role=customer', { headers: authHeaders }),
          fetch('/api/backend/v1/shipping', { headers: authHeaders }),
          fetch('/api/backend/v1/products/variants', { headers: authHeaders }),
        ])

        const usersJson = await usersRes.json()
        const shippingJson = await shippingRes.json()
        const variantsJson = await variantsRes.json()

        if (usersJson.success) {
          const userItems = ensureArray(usersJson.data?.items ?? usersJson.data)
          setCustomers(userItems as CustomerOption[])
        } else {
          toast.error(usersJson.message || t('failedToFetchUsers'))
          setCustomers([])
        }

        if (shippingJson.success) {
          const methods = ensureArray(shippingJson.data).filter((method: ShippingMethod) => method.is_active)
          setShippingMethods(methods)
        } else {
          toast.error(shippingJson.message || t('failedToFetchShippingMethods'))
          setShippingMethods([])
        }

        if (variantsJson.success) {
          setVariants(ensureArray(variantsJson.data))
        } else {
          toast.error(variantsJson.message || t('failedToFetchVariants'))
          setVariants([])
        }
      } catch (error) {
        console.error('Failed to load create order references:', error)
        toast.error(t('failedToLoadCreateOrderData'))
        setShippingMethods([])
        setVariants([])
        setCustomers([])
      } finally {
        setLoadingData(false)
      }
    }

    fetchReferences()
  }, [isOpen, t])

  useEffect(() => {
    if (!selectedCustomerId || Number(selectedCustomerId) <= 0) {
      setCustomerAddresses([])
      setAddressId('')
      return
    }

    let cancelled = false
    setLoadingAddresses(true)
    setAddressId('')

    const load = async () => {
      try {
        const { token } = getAuthData()
        if (!token) {
          if (!cancelled) setLoadingAddresses(false)
          return
        }
        const res = await fetch(`/api/backend/v1/users/${selectedCustomerId}/addresses`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
        const json = await res.json()
        if (cancelled) return
        if (!json.success) {
          setCustomerAddresses([])
          setAddressId('')
          toast.error(json.message || t('failedToLoadCreateOrderData'))
          return
        }
        const list = ensureArray(json.data) as CustomerAddress[]
        setCustomerAddresses(list)
        const def = list.find((a) => Number(a.is_default) === 1) ?? list[0]
        setAddressId(def ? String(def.address_id) : '')
      } catch {
        if (!cancelled) {
          setCustomerAddresses([])
          setAddressId('')
        }
      } finally {
        if (!cancelled) setLoadingAddresses(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [selectedCustomerId, t])

  const variantMap = useMemo(() => {
    return variants.reduce<Record<number, ProductVariant>>((acc, variant) => {
      acc[variant.variant_id] = variant
      return acc
    }, {})
  }, [variants])

  /** Danh sách sản phẩm duy nhất để chọn trước, sau đó mới chọn biến thể */
  const uniqueProducts = useMemo(() => {
    const map = new Map<number, { product_id: number; product_name: string }>()
    for (const v of variants) {
      if (!map.has(v.product_id)) {
        map.set(v.product_id, { product_id: v.product_id, product_name: v.product_name })
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.product_name.localeCompare(b.product_name, 'vi', { sensitivity: 'base' })
    )
  }, [variants])

  const selectedCustomer = useMemo(
    () => customers.find((c) => String(c.user_id) === selectedCustomerId),
    [customers, selectedCustomerId]
  )

  const estimatedTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const variant = variantMap[item.variant_id]
      if (!variant) return sum
      const listPrice = Number(variant.list_price) || 0
      return sum + listPrice * Math.max(item.quantity, 0)
    }, 0)
  }, [items, variantMap])

  const addItem = () => {
    setItems(prev => [...prev, { ...DEFAULT_ITEM }])
  }

  const removeItem = (index: number) => {
    if (items.length === 1) return
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, patch: Partial<OrderItemForm>) => {
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const setItemProduct = (index: number, productIdStr: string) => {
    const productId = Number(productIdStr) || 0
    setItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, product_id: productId, variant_id: 0 } : item
      )
    )
  }

  const validateForm = (): boolean => {
    if (!selectedCustomerId || Number(selectedCustomerId) <= 0) {
      toast.error(t('customerRequired'))
      return false
    }

    if (!shippingMethodId || Number(shippingMethodId) <= 0) {
      toast.error(t('shippingMethodRequired'))
      return false
    }

    if (!addressId || Number(addressId) <= 0) {
      toast.error(
        customerAddresses.length === 0 ? t('customerHasNoAddresses') : t('shippingAddressRequired')
      )
      return false
    }

    if (items.length === 0) {
      toast.error(t('atLeastOneOrderItem'))
      return false
    }

    for (const item of items) {
      if (!item.product_id || item.product_id <= 0) {
        toast.error(t('pleaseSelectProduct'))
        return false
      }
      if (!item.variant_id || item.variant_id <= 0) {
        toast.error(t('pleaseSelectSize'))
        return false
      }
      if (!item.quantity || item.quantity <= 0) {
        toast.error(t('quantityGreaterThanZero'))
        return false
      }
    }

    return true
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)
    try {
      const { token } = getAuthData()
      const payload: Record<string, unknown> = {
        customer_id: Number(selectedCustomerId),
        shipping_method_id: Number(shippingMethodId),
        items: items.map(item => ({
          variant_id: item.variant_id,
          quantity: item.quantity,
        })),
        payment_method: paymentMethod,
        note,
        internal_note: internalNote,
      }

      if (addressId && Number(addressId) > 0) {
        payload.address_id = Number(addressId)
      }

      const response = await fetch('/api/backend/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (data.success) {
        toast.success(t('orderCreatedSuccessfully'))
        onCreated()
        onClose()
      } else {
        toast.error(data.message || t('failedToCreateOrder'))
      }
    } catch (error) {
      console.error('Create order failed:', error)
      toast.error(t('failedToCreateOrder'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-6xl sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('createCounterOrder')}</DialogTitle>
          <DialogDescription>{t('createCounterOrderDesc')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>{t('customer')}</Label>
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={customerComboboxOpen}
                  className="w-full justify-between font-normal"
                  disabled={loadingData}
                  onClick={() => setCustomerComboboxOpen((prev) => !prev)}
                >
                  <span className="truncate text-left">
                    {selectedCustomer ? formatCustomerLabel(selectedCustomer) : t('selectCustomer')}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>

                {customerComboboxOpen && (
                  <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 rounded-md border bg-popover shadow-md">
                    <Command>
                      <CommandInput placeholder={t('searchCustomersPlaceholder')} />
                      <CommandList>
                        <CommandEmpty>{t('noCustomersInList')}</CommandEmpty>
                        <CommandGroup>
                          {customers.map((customer) => {
                            const label = formatCustomerLabel(customer)
                            const searchBlob = [
                              customer.user_id,
                              customer.account_name,
                              customer.first_name,
                              customer.last_name,
                              customer.email,
                              customer.phone,
                            ]
                              .filter(Boolean)
                              .join(' ')
                            return (
                              <CommandItem
                                key={customer.user_id}
                                value={searchBlob}
                                onSelect={() => {
                                  setSelectedCustomerId(String(customer.user_id))
                                  setCustomerComboboxOpen(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    selectedCustomerId === String(customer.user_id) ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                <span className="truncate">{label}</span>
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="counter-address-select">{t('shippingAddress')}</Label>
              <Select
                value={addressId}
                onValueChange={setAddressId}
                disabled={!selectedCustomerId || loadingAddresses}
              >
                <SelectTrigger id="counter-address-select">
                  <SelectValue
                    placeholder={
                      !selectedCustomerId
                        ? t('selectCustomer')
                        : loadingAddresses
                          ? t('loading')
                          : t('selectCustomerAddress')
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {customerAddresses.map((a) => (
                    <SelectItem key={a.address_id} value={String(a.address_id)}>
                      <span className="line-clamp-2 text-left">
                        {Number(a.is_default) === 1 ? `(${t('defaultAddressBadge')}) ` : ''}
                        {formatAddressOption(a)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCustomerId && !loadingAddresses && customerAddresses.length === 0 && (
                <p className="text-xs text-muted-foreground">{t('customerHasNoAddresses')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('shippingMethod')}</Label>
              <Select value={shippingMethodId} onValueChange={setShippingMethodId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectShippingMethod')} />
                </SelectTrigger>
                <SelectContent>
                  {shippingMethods.map((method) => (
                    <SelectItem key={method.shipping_method_id} value={String(method.shipping_method_id)}>
                      {method.name} - {new Intl.NumberFormat('vi-VN').format(method.fee)} VND
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('paymentMethod')}</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cod">{t('cod')}</SelectItem>
                  <SelectItem value="cash">{t('cash')}</SelectItem>
                  <SelectItem value="bank_transfer">{t('bank_transfer')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t('orderItems')}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                {t('addOrderItem')}
              </Button>
            </div>

            {items.map((item, index) => {
              const variantsForProduct = variants.filter((v) => v.product_id === item.product_id)
              const selectedVariant = item.variant_id > 0 ? variantMap[item.variant_id] : undefined
              const unitPrice = selectedVariant ? Number(selectedVariant.list_price) || 0 : 0
              const lineSubtotal = unitPrice * Math.max(item.quantity, 0)
              return (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(152px,168px)_minmax(148px,1fr)_44px] gap-2 md:gap-3 items-end"
                >
                  <div className="space-y-1 min-w-0">
                    <Label>{t('product')}</Label>
                    <Select value={item.product_id > 0 ? String(item.product_id) : ''} onValueChange={(value) => setItemProduct(index, value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('selectProduct')} />
                      </SelectTrigger>
                      <SelectContent className="max-w-[min(28rem,calc(100vw-2rem))]">
                        {uniqueProducts.map((p) => (
                          <SelectItem key={p.product_id} value={String(p.product_id)}>
                            <span className="truncate">{p.product_name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <Label>{t('size')}</Label>
                    <Select
                      value={item.variant_id > 0 ? String(item.variant_id) : ''}
                      onValueChange={(value) => updateItem(index, { variant_id: Number(value) })}
                      disabled={item.product_id <= 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={item.product_id <= 0 ? t('selectProductFirst') : t('pleaseSelectSize')}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {variantsForProduct.map((variant) => (
                          <SelectItem key={variant.variant_id} value={String(variant.variant_id)}>
                            {variant.size_name}
                            <span className="text-muted-foreground"> · {variant.sku}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>{t('quantity')}</Label>
                    <div className="flex h-10 items-stretch overflow-hidden rounded-md border border-input bg-background">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-9 shrink-0 rounded-none hover:bg-muted"
                        onClick={() => updateItem(index, { quantity: Math.max(1, item.quantity - 1) })}
                        disabled={item.quantity <= 1}
                        aria-label={t('decreaseQuantity')}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        className="h-10 min-w-0 flex-1 rounded-none border-0 border-x border-input px-1 text-center tabular-nums shadow-none [appearance:textfield] focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(event) => {
                          const n = Number(event.target.value)
                          updateItem(index, { quantity: Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1 })
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-9 shrink-0 rounded-none hover:bg-muted"
                        onClick={() => updateItem(index, { quantity: item.quantity + 1 })}
                        aria-label={t('increaseQuantity')}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1 min-w-0 pb-0.5">
                    <Label className="whitespace-nowrap">{t('orderItemAmountColumn')}</Label>
                    <div className="min-h-10 flex items-center justify-end rounded-md border border-input bg-muted/30 px-3 py-1.5 text-right">
                      {selectedVariant ? (
                        <span className="text-sm font-semibold tabular-nums text-foreground">{formatVnd(lineSubtotal)}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>

                  <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => removeItem(index)} disabled={items.length === 1}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="counter-note">{t('customerNote')}</Label>
              <Textarea
                id="counter-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t('orderNoteOptional')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="counter-internal-note">{t('internalNote')}</Label>
              <Textarea
                id="counter-internal-note"
                value={internalNote}
                onChange={(event) => setInternalNote(event.target.value)}
                placeholder={t('internalNoteOptional')}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 pt-1">
            <span className="text-base text-muted-foreground">{t('estimatedTotal')}:</span>
            <span className="text-xl font-bold tabular-nums tracking-tight text-foreground sm:text-2xl">
              {formatVnd(estimatedTotal)}
            </span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={submitting || loadingData || loadingAddresses}>
              {submitting ? t('creatingOrder') : t('createOrder')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
