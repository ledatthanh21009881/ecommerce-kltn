"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProtectedRoute from "@/components/protected-route"
import { authUtils, type User } from "@/lib/auth"

const orders = [
  {
    id: "ORD-12345",
    date: "May 15, 2023",
    status: "Delivered",
    total: "$300.00",
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
            <TabsList className="mb-8 grid w-full grid-cols-2 border-b border-gray-200 bg-transparent p-0">
              <TabsTrigger
                value="orders"
                className="rounded-none border-b-2 border-transparent pb-2 pt-0 data-[state=active]:border-black"
              >
                Order History
              </TabsTrigger>
              <TabsTrigger
                value="profile"
                className="rounded-none border-b-2 border-transparent pb-2 pt-0 data-[state=active]:border-black"
              >
                Profile
              </TabsTrigger>
            </TabsList>

            <TabsContent value="orders">
              <div className="space-y-6">
                {orders.map((order) => (
                  <div key={order.id} className="rounded-lg border border-gray-200 p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Order {order.id}</h3>
                        <p className="text-sm text-gray-600">{order.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{order.total}</p>
                        <p className="text-sm text-gray-600">{order.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="profile">
              <div className="max-w-md">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="firstName" className="text-sm font-medium">First Name</label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={profileData.firstName}
                        onChange={handleProfileChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="lastName" className="text-sm font-medium">Last Name</label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={profileData.lastName}
                        onChange={handleProfileChange}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">Email</label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium">Phone</label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={handleProfileChange}
                    />
                  </div>
                  <Button className="bg-black text-white hover:bg-gray-800">
                    Save Changes
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </ProtectedRoute>
  )
}
