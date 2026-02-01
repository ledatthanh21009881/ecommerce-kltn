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

const contentClass =
  "font-gotham text-black text-[17px] leading-[1.8] space-y-6"
const labelClass = "font-gotham text-[17px] text-black uppercase tracking-wider block mb-2"
const inputClass = "font-gotham text-[17px] border-black/20 rounded-none focus-visible:ring-black/30"

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
      <main className="min-h-screen">
        <div
          className="ml-[224px] pl-[24px] pt-[26px] pb-[87px] pr-12 font-gotham"
          style={{ fontFamily: "SVN-Gotham" }}
        >
          <div className={contentClass} style={{ fontFamily: "SVN-Gotham" }}>
            <h1 className="font-gotham text-2xl font-bold uppercase tracking-wider text-black mb-8">
              Account
            </h1>

            <Tabs defaultValue="orders" className="w-full">
              <TabsList className="mb-8 h-auto w-full max-w-md border-b border-black/20 bg-transparent p-0 pl-0 pr-0 justify-start">
                <TabsTrigger
                  value="orders"
                  className="font-gotham text-xs font-bold uppercase tracking-wider rounded-none border-b-2 border-transparent pb-3 pt-0 data-[state=active]:border-black data-[state=active]:text-black text-black/70"
                >
                  Orders
                </TabsTrigger>
                <TabsTrigger
                  value="profile"
                  className="font-gotham text-xs font-bold uppercase tracking-wider rounded-none border-b-2 border-transparent pb-3 pt-0 data-[state=active]:border-black data-[state=active]:text-black text-black/70"
                >
                  Profile
                </TabsTrigger>
                <TabsTrigger
                  value="addresses"
                  className="font-gotham text-xs font-bold uppercase tracking-wider rounded-none border-b-2 border-transparent pb-3 pt-0 data-[state=active]:border-black data-[state=active]:text-black text-black/70"
                >
                  Addresses
                </TabsTrigger>
              </TabsList>

              <TabsContent value="orders" className="mt-0">
                {orders.length > 0 ? (
                  <div className="space-y-8">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="border border-black/10 p-6 font-gotham text-[17px]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-4">
                          <div>
                            <p className="font-medium">{order.id}</p>
                            <p className="text-[15px] text-black/60">{order.date}</p>
                          </div>
                          <div className="flex items-center gap-6 text-[15px]">
                            <p>
                              Status: <span className="font-medium">{order.status}</span>
                            </p>
                            <p>
                              Total: <span className="font-medium">{order.total}</span>
                            </p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider">
                            Items
                          </h3>
                          <ul className="space-y-2">
                            {order.items.map((item, index) => (
                              <li
                                key={index}
                                className="flex justify-between text-[15px]"
                              >
                                <span>
                                  {item.name} x {item.quantity}
                                </span>
                                <span>{item.price}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <Link
                            href={`/account/orders/${order.id}`}
                            className="text-xs font-bold uppercase tracking-wider underline underline-offset-4 hover:no-underline"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-start py-12">
                    <p className="mb-6 text-[17px] text-black/70">
                      You haven&apos;t placed any orders yet.
                    </p>
                    <Link
                      href="/collections"
                      className="inline-block border border-black px-6 py-3 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-black hover:text-white"
                    >
                      Start Shopping
                    </Link>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="profile" className="mt-0">
                <div className="max-w-md">
                  <form className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label htmlFor="firstName" className={labelClass}>
                          First Name
                        </label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={profileData.firstName}
                          onChange={handleProfileChange}
                          className={inputClass}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="lastName" className={labelClass}>
                          Last Name
                        </label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={profileData.lastName}
                          onChange={handleProfileChange}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="email" className={labelClass}>
                        Email
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={profileData.email}
                        onChange={handleProfileChange}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="phone" className={labelClass}>
                        Phone
                      </label>
                      <Input
                        id="phone"
                        name="phone"
                        value={profileData.phone}
                        onChange={handleProfileChange}
                        className={inputClass}
                      />
                    </div>

                    <div className="border-t border-black/10 pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-gotham text-[17px] font-medium uppercase tracking-wider">
                            Password
                          </h3>
                          <p className="text-[15px] text-black/60 mt-1">
                            Change your account password
                          </p>
                        </div>
                        <Link href="/change-password">
                          <Button
                            variant="outline"
                            size="sm"
                            className="font-gotham text-xs font-bold uppercase tracking-wider rounded-none border-black/30 hover:bg-black/5"
                          >
                            Change Password
                          </Button>
                        </Link>
                      </div>
                    </div>

                    <Button
                      type="button"
                      className="font-gotham text-xs font-bold uppercase tracking-wider bg-black text-white rounded-none hover:bg-black/90"
                    >
                      Save Changes
                    </Button>
                  </form>
                </div>
              </TabsContent>

              <TabsContent value="addresses" className="mt-0">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="border border-black/10 p-6 font-gotham">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-[17px] font-medium uppercase tracking-wider">
                        Shipping Address
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-gotham text-xs uppercase tracking-wider rounded-none border-black/30"
                      >
                        Edit
                      </Button>
                    </div>
                    <div className="space-y-1 text-[15px] text-black/80 leading-[1.8]">
                      <p>Jane Doe</p>
                      <p>123 Fashion Street</p>
                      <p>Apt 4B</p>
                      <p>New York, NY 10001</p>
                      <p>United States</p>
                      <p>+1 (555) 123-4567</p>
                    </div>
                  </div>

                  <div className="border border-black/10 p-6 font-gotham">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-[17px] font-medium uppercase tracking-wider">
                        Billing Address
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-gotham text-xs uppercase tracking-wider rounded-none border-black/30"
                      >
                        Edit
                      </Button>
                    </div>
                    <div className="space-y-1 text-[15px] text-black/80 leading-[1.8]">
                      <p>Jane Doe</p>
                      <p>123 Fashion Street</p>
                      <p>Apt 4B</p>
                      <p>New York, NY 10001</p>
                      <p>United States</p>
                      <p>+1 (555) 123-4567</p>
                    </div>
                  </div>

                  <div className="flex h-full min-h-[200px] items-center justify-center border border-dashed border-black/20 p-6">
                    <Button
                      variant="outline"
                      className="font-gotham text-xs font-bold uppercase tracking-wider rounded-none border-black/30 hover:bg-black/5"
                    >
                      Add New Address
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  )
}
