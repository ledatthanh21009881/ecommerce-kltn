"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion } from "framer-motion"
import { Search, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"

// Mock data for orders
const orders = [
  {
    id: "ORD-12345",
    date: "May 15, 2023",
    status: "Delivered",
    total: "1,580,000 Đ",
    items: [
      { name: "BLACK SIDE PLEAT WIDE LEG JEANS", quantity: 1, price: "890,000 Đ" },
      { name: "BLACK CUT-OUT LONG SLEEVE SHIRT", quantity: 1, price: "690,000 Đ" },
    ],
  },
  {
    id: "ORD-12346",
    date: "June 2, 2023",
    status: "Shipping",
    total: "950,000 Đ",
    items: [{ name: "SMUDGE STRAIGHT FIT JEANS", quantity: 1, price: "950,000 Đ" }],
  },
  {
    id: "ORD-12347",
    date: "June 10, 2023",
    status: "Processing",
    total: "1,200,000 Đ",
    items: [{ name: "VIVIENNE SILK BLOUSE", quantity: 1, price: "1,200,000 Đ" }],
  },
]

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  const filteredOrders = orders.filter((order) => {
    // Filter by search query
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))

    // Filter by tab
    if (activeTab === "all") return matchesSearch
    return matchesSearch && order.status.toLowerCase() === activeTab.toLowerCase()
  })

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-green-100 text-green-800"
      case "shipping":
        return "bg-blue-100 text-blue-800"
      case "processing":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
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
                {renderOrdersList(filteredOrders, getStatusColor)}
              </TabsContent>
              <TabsContent value="processing" className="mt-0">
                {renderOrdersList(filteredOrders, getStatusColor)}
              </TabsContent>
              <TabsContent value="shipping" className="mt-0">
                {renderOrdersList(filteredOrders, getStatusColor)}
              </TabsContent>
              <TabsContent value="delivered" className="mt-0">
                {renderOrdersList(filteredOrders, getStatusColor)}
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </div>
    </main>
  )
}

function renderOrdersList(orders, getStatusColor) {
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
      {orders.map((order) => (
        <div key={order.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between border-b border-gray-200 bg-gray-50 p-4 sm:flex-nowrap">
            <div>
              <p className="font-medium">Order {order.id}</p>
              <p className="text-sm text-gray-600">{order.date}</p>
            </div>
            <div className="mt-2 flex items-center gap-4 sm:mt-0">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}
              >
                {order.status}
              </span>
              <p className="font-medium">{order.total}</p>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-4 space-y-2">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <p className="text-sm">
                    {item.name} <span className="text-gray-600">x{item.quantity}</span>
                  </p>
                  <p className="text-sm">{item.price}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-4">
              <Link href={`/account/orders/${order.id}`}>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </Link>
              {order.status.toLowerCase() === "shipping" && (
                <Link href={`/account/orders/tracking/${order.id}`}>
                  <Button size="sm" className="bg-black text-white hover:bg-gray-800">
                    Track Order
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
