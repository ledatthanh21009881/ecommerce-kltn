"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion } from "framer-motion"
import { Search, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { getAuthData } from "@/lib/admin-auth"
import { toast } from "sonner"

interface OrderItem {
  product_name_snapshot: string
  quantity: number
  unit_price: number
}

interface Order {
  order_id: number
  invoice_number: string | null
  created_at: string
  status: string
  total_amount: number
  items: OrderItem[]
}

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const { token } = getAuthData()
      
      if (!token) {
        toast.error('Vui lòng đăng nhập')
        return
      }

      const response = await fetch('/api/backend/v1/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        // Map backend format to frontend format
        const mappedOrders = (data.data.items || data.data || []).map((order: any) => ({
          order_id: order.order_id,
          invoice_number: order.invoice_number,
          created_at: order.created_at,
          status: order.status,
          total_amount: parseFloat(order.total_amount || 0),
          items: order.items || []
        }))
        setOrders(mappedOrders)
      } else {
        toast.error(data.message || 'Failed to load orders')
      }
    } catch (error) {
      console.error('Error loading orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter((order) => {
    // Filter by search query
    const orderId = order.invoice_number || `ORD-${order.order_id}`
    const matchesSearch =
      orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some((item) => item.product_name_snapshot?.toLowerCase().includes(searchQuery.toLowerCase()))

    // Filter by tab
    if (activeTab === "all") return matchesSearch
    return matchesSearch && order.status.toLowerCase() === activeTab.toLowerCase()
  })

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "delivered":
        return "bg-green-100 text-green-800"
      case "shipping":
        return "bg-blue-100 text-blue-800"
      case "processing":
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <main className="pt-24">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">Loading...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="pt-24">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="mb-8 font-serif text-3xl font-light md:text-4xl">My Orders</h1>

            {/* Search and Filter */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="mb-8 grid w-full grid-cols-4 bg-transparent">
                <TabsTrigger
                  value="all"
                  className="rounded-none border-b-2 border-transparent pb-2 pt-0 data-[state=active]:border-black"
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="processing"
                  className="rounded-none border-b-2 border-transparent pb-2 pt-0 data-[state=active]:border-black"
                >
                  Processing
                </TabsTrigger>
                <TabsTrigger
                  value="shipping"
                  className="rounded-none border-b-2 border-transparent pb-2 pt-0 data-[state=active]:border-black"
                >
                  Shipping
                </TabsTrigger>
                <TabsTrigger
                  value="delivered"
                  className="rounded-none border-b-2 border-transparent pb-2 pt-0 data-[state=active]:border-black"
                >
                  Delivered
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-0">
                {renderOrdersList(filteredOrders, getStatusColor, formatDate, formatPrice)}
              </TabsContent>
              <TabsContent value="processing" className="mt-0">
                {renderOrdersList(filteredOrders, getStatusColor, formatDate, formatPrice)}
              </TabsContent>
              <TabsContent value="shipping" className="mt-0">
                {renderOrdersList(filteredOrders, getStatusColor, formatDate, formatPrice)}
              </TabsContent>
              <TabsContent value="delivered" className="mt-0">
                {renderOrdersList(filteredOrders, getStatusColor, formatDate, formatPrice)}
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </main>
  )
}

function renderOrdersList(orders: Order[], getStatusColor: (status: string) => string, formatDate: (date: string) => string, formatPrice: (amount: number) => string) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="mb-6 text-lg text-gray-600">No orders found</p>
        <Link
          href="/all-products"
          className="inline-block border border-black px-8 py-3 text-sm font-medium transition-colors hover:bg-black hover:text-white"
        >
          Continue Shopping
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {orders.map((order) => {
        const orderId = order.invoice_number || `ORD-${order.order_id}`
        return (
          <div key={order.order_id} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between border-b border-gray-200 bg-gray-50 p-4 sm:flex-nowrap">
              <div>
                <p className="font-medium">Order {orderId}</p>
                <p className="text-sm text-gray-600">{formatDate(order.created_at)}</p>
              </div>
              <div className="mt-2 flex items-center gap-4 sm:mt-0">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}
                >
                  {order.status}
                </span>
                <p className="font-medium">{formatPrice(order.total_amount)}</p>
              </div>
            </div>

            <div className="p-4">
              <div className="mb-4 space-y-2">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <p className="text-sm">
                      {item.product_name_snapshot} <span className="text-gray-600">x{item.quantity}</span>
                    </p>
                    <p className="text-sm">{formatPrice(item.unit_price * item.quantity)}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-4">
                <Link href={`/account/orders/tracking/${order.order_id}`}>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </Link>
                {(order.status.toLowerCase() === "shipping" || order.status.toLowerCase() === "processing") && (
                  <Link href={`/account/orders/tracking/${order.order_id}`}>
                    <Button size="sm" className="bg-black text-white hover:bg-gray-800">
                      Track Order
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
