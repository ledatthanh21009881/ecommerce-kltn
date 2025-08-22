"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Minus, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

// Sample cart data
const initialCartItems = [
  {
    id: 1,
    name: "VIVIENNE Silk Blouse",
    price: 120,
    color: "White",
    size: "M",
    quantity: 1,
    image: "/placeholder.svg?height=120&width=90",
  },
  {
    id: 2,
    name: "Tailored Wool Trousers",
    price: 180,
    color: "Black",
    size: "S",
    quantity: 1,
    image: "/placeholder.svg?height=120&width=90",
  },
]

export default function CartPage() {
  const [cartItems, setCartItems] = useState(initialCartItems)

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity < 1) return
    setCartItems(cartItems.map((item) => (item.id === id ? { ...item, quantity: newQuantity } : item)))
  }

  const removeItem = (id) => {
    setCartItems(cartItems.filter((item) => item.id !== id))
  }

  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0)
  const shipping = subtotal > 100 ? 0 : 10
  const total = subtotal + shipping

  return (
    <main className="pt-24">
      <div className="container mx-auto px-4 py-12">
        <h1 className="mb-8 font-serif text-3xl font-light md:text-4xl">Shopping Cart</h1>

        {cartItems.length > 0 ? (
          <div className="grid gap-12 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {/* Cart Items */}
              <div className="divide-y divide-gray-200">
                {cartItems.map((item) => (
                  <motion.div
                    key={item.id}
                    className="flex gap-4 py-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="relative h-[120px] w-[90px] flex-shrink-0 overflow-hidden">
                      <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
                    </div>

                    <div className="flex flex-1 flex-col">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="font-serif text-lg font-light">{item.name}</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            {item.color} / {item.size}
                          </p>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-black">
                          <X className="h-5 w-5" />
                          <span className="sr-only">Remove</span>
                        </button>
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-4">
                        <div className="flex h-8 w-24 items-center border border-gray-300">
                          <button
                            className="flex h-full w-8 items-center justify-center border-r border-gray-300"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <div className="flex h-full flex-1 items-center justify-center text-sm">{item.quantity}</div>
                          <button
                            className="flex h-full w-8 items-center justify-center border-l border-gray-300"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="font-medium">${item.price}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="rounded-md border border-gray-200 p-6">
                <h2 className="mb-4 font-serif text-xl font-light">Order Summary</h2>
                <div className="space-y-3 border-b border-gray-200 pb-4">
                  <div className="flex justify-between">
                    <p className="text-gray-600">Subtotal</p>
                    <p>${subtotal.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-gray-600">Shipping</p>
                    <p>{shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}</p>
                  </div>
                </div>
                <div className="flex justify-between py-4">
                  <p className="font-medium">Total</p>
                  <p className="font-medium">${total.toFixed(2)}</p>
                </div>
                <Button className="mt-4 h-12 w-full bg-black text-white hover:bg-gray-800">Proceed to Checkout</Button>
                <p className="mt-4 text-center text-sm text-gray-500">Free shipping on orders over $100</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="mb-6 text-lg text-gray-600">Your cart is empty</p>
            <Link
              href="/collections"
              className="inline-block border border-black px-8 py-3 text-sm font-medium transition-colors hover:bg-black hover:text-white"
            >
              Continue Shopping
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
