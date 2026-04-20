'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search } from 'lucide-react'
import { UserOrderCard } from '@/components/account/UserOrderCard'
import { useLanguage } from '@/components/language-provider'

export interface OrderItem {
  product_name?: string
  product_name_snapshot?: string
  quantity: number
  unit_price?: number
}

export interface Order {
  order_id: number
  invoice_number: string | null
  created_at: string
  status: string
  total_amount: number
  items: OrderItem[]
}

function formatDateShort(dateString: string) {
  const d = new Date(dateString)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(amount)
}

/** Map API response (data from userOrdersApi.getOrders()) to Order[]. */
export function mapApiOrdersToOrders(data: unknown): Order[] {
  const payload = data as { success?: boolean; data?: { items?: unknown[] } }
  const list = payload?.data?.items ?? []
  return (Array.isArray(list) ? list : []).map((order: unknown) => {
    const o = order as Record<string, unknown>
    return {
      order_id: Number(o.order_id),
      invoice_number: o.invoice_number as string | null,
      created_at: String(o.created_at ?? ''),
      status: String(o.status ?? ''),
      total_amount: parseFloat(String(o.total_amount || 0)),
      items: (o.items as OrderItem[]) ?? [],
    }
  })
}

export interface OrderListSectionProps {
  orders: Order[]
  loading: boolean
  error: string | null
  onRetry?: () => void
  showTitle?: boolean
}

export function OrderListSection({
  orders,
  loading,
  error,
  onRetry,
  showTitle = false,
}: OrderListSectionProps) {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  const filteredOrders = orders.filter((order) => {
    const orderId = order.invoice_number || `ORD-${order.order_id}`
    const status = (order.status ?? '').toString().toLowerCase()
    const items = order.items ?? []
    const matchesSearch =
      orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      items.some((item) => {
        const name = item.product_name ?? item.product_name_snapshot ?? ''
        return name.toLowerCase().includes(searchQuery.toLowerCase())
      })
    if (activeTab === 'all') return matchesSearch
    return matchesSearch && status === activeTab.toLowerCase()
  })

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded-xl" />
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="h-32 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('account.retry')}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showTitle && (
        <h2 className="text-xl font-bold text-black">{t('account.tabOrders')}</h2>
      )}

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder={t('account.ordersSearchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 rounded-xl border-gray-200 bg-white"
        />
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="mb-4 grid w-full grid-cols-4 rounded-xl bg-white border border-gray-200 p-1 h-auto">
          <TabsTrigger
            value="all"
            className="rounded-lg data-[state=active]:bg-gray-900 data-[state=active]:text-white"
          >
            {t('account.ordersTabAll')}
          </TabsTrigger>
          <TabsTrigger
            value="processing"
            className="rounded-lg data-[state=active]:bg-gray-900 data-[state=active]:text-white"
          >
            {t('account.ordersTabProcessing')}
          </TabsTrigger>
          <TabsTrigger
            value="shipping"
            className="rounded-lg data-[state=active]:bg-gray-900 data-[state=active]:text-white"
          >
            {t('account.ordersTabShipping')}
          </TabsTrigger>
          <TabsTrigger
            value="delivered"
            className="rounded-lg data-[state=active]:bg-gray-900 data-[state=active]:text-white"
          >
            {t('account.ordersTabDelivered')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          {renderList(filteredOrders, t)}
        </TabsContent>
        <TabsContent value="processing" className="mt-0">
          {renderList(filteredOrders, t)}
        </TabsContent>
        <TabsContent value="shipping" className="mt-0">
          {renderList(filteredOrders, t)}
        </TabsContent>
        <TabsContent value="delivered" className="mt-0">
          {renderList(filteredOrders, t)}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function renderList(orders: Order[], t: (key: string) => string) {
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-600 mb-4">{t('account.ordersEmpty')}</p>
        <Link
          href="/collections"
          className="inline-block rounded-xl bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          {t('account.ordersShopNow')}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <UserOrderCard
          key={order.order_id}
          orderId={order.order_id}
          invoiceNumber={order.invoice_number || `ORD-${order.order_id}`}
          status={order.status}
          totalAmount={formatPrice(order.total_amount)}
          createdAt={formatDateShort(order.created_at)}
          itemCount={order.items?.length ?? 0}
          detailHref={`/account/orders/${order.order_id}`}
        />
      ))}
    </div>
  )
}
