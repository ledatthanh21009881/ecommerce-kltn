"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Phone, MessageCircle, ArrowLeft, MapPin, Clock, Package, Truck, CheckCircle } from "lucide-react"
import { motion } from "framer-motion"

// Mock data for the order
const orderData = {
  id: "ORD-12345",
  status: "shipping", // confirmed, packaging, shipping, delivered
  orderDate: "2023-05-15T10:30:00",
  estimatedDelivery: "2023-05-18T14:00:00",
  items: [
    { name: "BLACK SIDE PLEAT WIDE LEG JEANS", quantity: 1, price: "890,000 Đ" },
    { name: "BLACK CUT-OUT LONG SLEEVE SHIRT", quantity: 1, price: "690,000 Đ" },
  ],
  shipper: {
    name: "Nguyễn Văn A",
    phone: "+84 123 456 789",
    vehicle: "Honda Wave",
    currentLocation: "123 Nguyễn Huệ, Quận 1, TP.HCM",
    coordinates: { lat: 10.7769, lng: 106.7009 }, // Ho Chi Minh City coordinates
  },
  shippingAddress: {
    name: "Trần Văn B",
    address: "456 Lê Lợi, Quận 1, TP.HCM",
    phone: "+84 987 654 321",
    coordinates: { lat: 10.7731, lng: 106.7031 },
  },
}

export default function OrderTrackingPage({ params }) {
  const { id } = params
  const [order, setOrder] = useState(orderData)
  const [map, setMap] = useState(null)
  const [shipperMarker, setShipperMarker] = useState(null)

  // Format date to local time
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString("vi-VN", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Get status step number
  const getStatusStep = (status) => {
    const steps = { confirmed: 1, packaging: 2, shipping: 3, delivered: 4 }
    return steps[status] || 1
  }

  // Initialize Google Maps
  useEffect(() => {
    // This would normally load the Google Maps API and initialize the map
    // For this example, we'll just simulate it
    console.log("Map would initialize here with shipper location:", order.shipper.coordinates)
  }, [])

  // Update shipper location periodically
  useEffect(() => {
    const interval = setInterval(() => {
      // This would normally fetch the updated location from an API
      // For this example, we'll just simulate movement
      setOrder((prevOrder) => {
        const newLat = prevOrder.shipper.coordinates.lat + (Math.random() - 0.5) * 0.001
        const newLng = prevOrder.shipper.coordinates.lng + (Math.random() - 0.5) * 0.001
        return {
          ...prevOrder,
          shipper: {
            ...prevOrder.shipper,
            coordinates: { lat: newLat, lng: newLng },
          },
        }
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <main className="pt-24">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {/* Back Button */}
            <Link
              href="/account/orders"
              className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-black"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Link>

            {/* Order Header */}
            <div className="mb-8 flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:flex-row md:items-center">
              <div>
                <h1 className="font-serif text-2xl font-light">Order Tracking</h1>
                <p className="mt-1 text-gray-600">
                  Order <span className="font-medium">{order.id}</span>
                </p>
              </div>
              <div className="mt-4 flex items-center md:mt-0">
                <Clock className="mr-2 h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Estimated delivery: {formatDate(order.estimatedDelivery)}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="mb-4 flex justify-between">
                <span className="text-sm font-medium">Order Status</span>
                <span className="text-sm text-gray-600">Order placed on {formatDate(order.orderDate)}</span>
              </div>

              <div className="relative mb-6">
                <div className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-gray-200"></div>
                <div
                  className="absolute left-0 top-1/2 h-1 -translate-y-1/2 bg-black transition-all duration-500"
                  style={{ width: `${(getStatusStep(order.status) / 4) * 100}%` }}
                ></div>
                <div className="relative flex justify-between">
                  <div className="flex flex-col items-center">
                    <div
                      className={`z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                        getStatusStep(order.status) >= 1
                          ? "border-black bg-black text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {getStatusStep(order.status) > 1 ? <CheckCircle className="h-5 w-5" /> : "1"}
                    </div>
                    <span className="mt-2 text-xs">Confirmed</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div
                      className={`z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                        getStatusStep(order.status) >= 2
                          ? "border-black bg-black text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {getStatusStep(order.status) > 2 ? <CheckCircle className="h-5 w-5" /> : "2"}
                    </div>
                    <span className="mt-2 text-xs">Packaging</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div
                      className={`z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                        getStatusStep(order.status) >= 3
                          ? "border-black bg-black text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {getStatusStep(order.status) > 3 ? <CheckCircle className="h-5 w-5" /> : "3"}
                    </div>
                    <span className="mt-2 text-xs">Shipping</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div
                      className={`z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                        getStatusStep(order.status) >= 4
                          ? "border-black bg-black text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      4
                    </div>
                    <span className="mt-2 text-xs">Delivered</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Map */}
            <div className="mb-8 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
              <div className="relative h-64 w-full">
                {/* This would be replaced with an actual Google Map */}
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                  <p className="text-gray-500">Google Maps would be displayed here</p>
                </div>
                {/* Map overlay with current status */}
                <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-90 p-4">
                  <div className="flex items-center">
                    {order.status === "shipping" ? (
                      <>
                        <Truck className="mr-2 h-5 w-5 text-black" />
                        <span>Your order is on the way</span>
                      </>
                    ) : order.status === "delivered" ? (
                      <>
                        <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
                        <span>Your order has been delivered</span>
                      </>
                    ) : (
                      <>
                        <Package className="mr-2 h-5 w-5 text-black" />
                        <span>Your order is being prepared</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Shipper Information */}
            {order.status === "shipping" && (
              <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 font-serif text-xl font-light">Delivery Information</h2>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center">
                    <div className="mr-4 h-16 w-16 overflow-hidden rounded-full bg-gray-200">
                      <Image
                        src="/placeholder.svg?height=64&width=64"
                        alt={order.shipper.name}
                        width={64}
                        height={64}
                      />
                    </div>
                    <div>
                      <h3 className="font-medium">{order.shipper.name}</h3>
                      <p className="text-sm text-gray-600">{order.shipper.vehicle}</p>
                      <div className="mt-1 flex items-center">
                        <MapPin className="mr-1 h-4 w-4 text-gray-500" />
                        <span className="text-xs text-gray-500">{order.shipper.currentLocation}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-2 md:mt-0">
                    <Button variant="outline" size="sm" className="flex items-center">
                      <Phone className="mr-2 h-4 w-4" />
                      Call
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Chat
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Address */}
            <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-serif text-xl font-light">Delivery Address</h2>
              <div>
                <p className="font-medium">{order.shippingAddress.name}</p>
                <p className="text-gray-600">{order.shippingAddress.address}</p>
                <p className="text-gray-600">{order.shippingAddress.phone}</p>
              </div>
            </div>

            {/* Order Items */}
            <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-serif text-xl font-light">Order Items</h2>
              <div className="divide-y divide-gray-200">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                    </div>
                    <p>{item.price}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-x-4 sm:space-y-0">
              <Link
                href={`/account/orders/${order.id}`}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                View Order Details
              </Link>
              <Button variant="outline">Contact Support</Button>
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  )
}
