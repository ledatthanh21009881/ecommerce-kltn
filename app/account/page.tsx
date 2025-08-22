"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProtectedRoute from "@/components/protected-route"
import { authUtils, type User } from "@/lib/auth"

// Sample order data
const orders = [
  {
    id: "ORD-12345",
    date: "May 15, 2023",
    status: "Delivered",
    total: "$300.00",
    items: [
      { name: "VIVIENNE Silk Blouse", quantity: 1, price: "$120.00" },
      { name: "Tailored Wool Trousers", quantity: 1, price: "$180.00" },
    ],
  },
  {
    id: "ORD-12344",
    date: "April 2, 2023",
    status: "Delivered",
    total: "$220.00",
    items: [{ name: "Oversized Cashmere Sweater", quantity: 1, price: "$220.00" }],
  },
]

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  })

  useEffect(() => {
    const userData = authUtils.getUser()
    if (userData) {
      setUser(userData)
      setProfileData({
        firstName: userData.first_name,
        lastName: userData.last_name,
        email: userData.email,
        phone: userData.phone,
      })
    }
  }, [])

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProfileData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <ProtectedRoute>
      <main className="pt-24">
      <div className="container mx-auto px-4 py-12">
        <h1 className="mb-8 font-serif text-3xl font-light md:text-4xl">My Account</h1>

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="mb-8 grid w-full grid-cols-3 border-b border-gray-200 bg-transparent p-0">
            <TabsTrigger
              value="orders"
              className="rounded-none border-b-2 border-transparent pb-2 pt-0 data-[state=active]:border-black"
            >
              Orders
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="rounded-none border-b-2 border-transparent pb-2 pt-0 data-[state=active]:border-black"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="addresses"
              className="rounded-none border-b-2 border-transparent pb-2 pt-0 data-[state=active]:border-black"
            >
              Addresses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-0">
            {orders.length > 0 ? (
              <div className="space-y-8">
                {orders.map((order) => (
                  <div key={order.id} className="rounded-md border border-gray-200 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
                      <div>
                        <p className="font-medium">{order.id}</p>
                        <p className="text-sm text-gray-500">{order.date}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-sm">
                          Status: <span className="font-medium">{order.status}</span>
                        </p>
                        <p className="text-sm">
                          Total: <span className="font-medium">{order.total}</span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="mb-2 text-sm font-medium">Items</h3>
                      <ul className="space-y-2">
                        {order.items.map((item, index) => (
                          <li key={index} className="flex justify-between text-sm">
                            <span>
                              {item.name} x {item.quantity}
                            </span>
                            <span>{item.price}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Link href={`/account/orders/${order.id}`} className="text-sm underline underline-offset-4">
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="mb-6 text-lg text-gray-600">You haven't placed any orders yet</p>
                <Link
                  href="/collections"
                  className="inline-block border border-black px-8 py-3 text-sm font-medium transition-colors hover:bg-black hover:text-white"
                >
                  Start Shopping
                </Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile" className="mt-0">
            <div className="max-w-md">
              <form className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="text-sm">
                      First Name
                    </label>
                    <Input id="firstName" name="firstName" value={profileData.firstName} onChange={handleProfileChange} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="text-sm">
                      Last Name
                    </label>
                    <Input id="lastName" name="lastName" value={profileData.lastName} onChange={handleProfileChange} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm">
                    Email
                  </label>
                  <Input id="email" name="email" type="email" value={profileData.email} onChange={handleProfileChange} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm">
                    Phone
                  </label>
                  <Input id="phone" name="phone" value={profileData.phone} onChange={handleProfileChange} />
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Password</h3>
                      <p className="text-sm text-gray-500">Change your account password</p>
                    </div>
                    <Link href="/change-password">
                      <Button variant="outline" size="sm">
                        Change Password
                      </Button>
                    </Link>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="currentPassword" className="text-sm">
                    Current Password
                  </label>
                  <Input id="currentPassword" name="currentPassword" type="password" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="newPassword" className="text-sm">
                      New Password
                    </label>
                    <Input id="newPassword" name="newPassword" type="password" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-sm">
                      Confirm Password
                    </label>
                    <Input id="confirmPassword" name="confirmPassword" type="password" />
                  </div>
                </div>
                <Button className="bg-black text-white hover:bg-gray-800">Save Changes</Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="addresses" className="mt-0">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-md border border-gray-200 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-medium">Shipping Address</h3>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </div>
                <div className="space-y-1 text-sm">
                  <p>Jane Doe</p>
                  <p>123 Fashion Street</p>
                  <p>Apt 4B</p>
                  <p>New York, NY 10001</p>
                  <p>United States</p>
                  <p>+1 (555) 123-4567</p>
                </div>
              </div>

              <div className="rounded-md border border-gray-200 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-medium">Billing Address</h3>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </div>
                <div className="space-y-1 text-sm">
                  <p>Jane Doe</p>
                  <p>123 Fashion Street</p>
                  <p>Apt 4B</p>
                  <p>New York, NY 10001</p>
                  <p>United States</p>
                  <p>+1 (555) 123-4567</p>
                </div>
              </div>

              <div className="flex h-full items-center justify-center rounded-md border border-dashed border-gray-300 p-6">
                <Button variant="outline">Add New Address</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
    </ProtectedRoute>
  )
}
