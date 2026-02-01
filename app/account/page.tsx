"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProtectedRoute from "@/components/protected-route"
import { authUtils, type User } from "@/lib/auth"
import { userOrdersApi } from "@/lib/userOrdersApi"
import { OrderListSection, type Order, mapApiOrdersToOrders } from "@/components/account/OrderListSection"

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
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState<string | null>(null)

  const loadOrders = async () => {
    setOrdersLoading(true)
    setOrdersError(null)
    const { ok, data } = await userOrdersApi.getOrders()
    setOrdersLoading(false)
    if (!ok) {
      setOrdersError((data as { message?: string })?.message ?? "Không tải được đơn hàng")
      return
    }
    setOrders(mapApiOrdersToOrders(data))
  }

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

  useEffect(() => {
    loadOrders()
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
                <OrderListSection
                  orders={orders}
                  loading={ordersLoading}
                  error={ordersError}
                  onRetry={loadOrders}
                  showTitle={false}
                />
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
