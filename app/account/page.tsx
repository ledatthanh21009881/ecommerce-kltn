"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProtectedRoute from "@/components/protected-route"
import { cn } from "@/lib/utils"
import { authUtils, type User } from "@/lib/auth"
import { userOrdersApi } from "@/lib/userOrdersApi"
import { profileApi } from "@/lib/profileApi"
import { addressesApi, type AddressItem, type AddressPayload } from "@/lib/addressesApi"
import { OrderListSection, type Order, mapApiOrdersToOrders } from "@/components/account/OrderListSection"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Check, ChevronsUpDown } from "lucide-react"

interface ProvinceOption {
  name: string
  code: number
  districts?: DistrictOption[]
}
interface DistrictOption {
  name: string
  code: number
  province_code: number
  wards?: WardOption[]
}
interface WardOption {
  name: string
  code: number
  district_code: number
}

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
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ phone?: string; email?: string }>({})

  const [addressesList, setAddressesList] = useState<AddressItem[]>([])
  const [addressesLoading, setAddressesLoading] = useState(false)
  const [addressesError, setAddressesError] = useState<string | null>(null)
  const [addressDialogOpen, setAddressDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<AddressItem | null>(null)
  const [addressForm, setAddressForm] = useState<AddressPayload & { phoneRaw?: string }>({
    receiver_name: "",
    phone: "",
    address_line: "",
    ward: "",
    district: "",
    province: "",
    is_default: false,
  })
  const [addressSaving, setAddressSaving] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
  const [selectedAddressIds, setSelectedAddressIds] = useState<number[]>([])
  const [bulkDeleteIds, setBulkDeleteIds] = useState<number[] | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const [provinces, setProvinces] = useState<ProvinceOption[]>([])
  const [districts, setDistricts] = useState<DistrictOption[]>([])
  const [wards, setWards] = useState<WardOption[]>([])
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<number | null>(null)
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<number | null>(null)
  const [selectedWardCode, setSelectedWardCode] = useState<number | null>(null)
  const [provinceOpen, setProvinceOpen] = useState(false)
  const [districtOpen, setDistrictOpen] = useState(false)
  const [wardOpen, setWardOpen] = useState(false)

  const PHONE_REGEX = /^0[0-9]{9}$/
  const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)

  const loadProfile = async () => {
    setProfileLoading(true)
    setProfileError(null)
    const { ok, data } = await profileApi.getProfile()
    setProfileLoading(false)
    if (ok && data?.success && data.data) {
      const u = data.data
      setUser({
        user_id: u.user_id,
        first_name: u.first_name ?? "",
        last_name: u.last_name ?? "",
        email: u.email ?? "",
        phone: u.phone ?? "",
        gender: u.gender ?? "",
        birthdate: u.birthdate ?? null,
        avatar_url: u.avatar_url ?? null,
        account_name: u.account_name ?? "",
        last_login_at: null,
        roles: u.roles ?? [],
      })
      setProfileData({
        firstName: u.first_name ?? "",
        lastName: u.last_name ?? "",
        email: u.email ?? "",
        phone: u.phone ?? "",
      })
      authUtils.saveUser({
        user_id: u.user_id,
        first_name: u.first_name ?? "",
        last_name: u.last_name ?? "",
        email: u.email ?? "",
        phone: u.phone ?? "",
        gender: u.gender ?? "",
        birthdate: u.birthdate ?? null,
        avatar_url: u.avatar_url ?? null,
        account_name: u.account_name ?? "",
        last_login_at: null,
        roles: u.roles ?? [],
      })
    } else {
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
      if (!ok) {
        setProfileError((data as { message?: string })?.message ?? "Không tải được thông tin tài khoản")
      }
    }
  }

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

  const loadAddresses = async () => {
    setAddressesLoading(true)
    setAddressesError(null)
    const { ok, data } = await addressesApi.getList()
    setAddressesLoading(false)
    if (ok && data?.success && Array.isArray(data.data)) {
      setAddressesList(data.data)
    } else {
      setAddressesError((data as { message?: string })?.message ?? "Không tải được địa chỉ")
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    loadOrders()
  }, [])

  useEffect(() => {
    loadAddresses()
  }, [])

  const loadProvinces = async () => {
    try {
      const res = await fetch("https://provinces.open-api.vn/api/p/")
      if (res.ok) {
        const data: ProvinceOption[] = await res.json()
        setProvinces(data)
      }
    } catch {
      toast.error("Không tải được danh sách tỉnh/thành phố")
    }
  }

  const loadDistricts = async (provinceCode: number) => {
    try {
      const res = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`)
      if (res.ok) {
        const province: ProvinceOption = await res.json()
        setDistricts(province.districts ?? [])
      } else {
        setDistricts([])
      }
    } catch {
      setDistricts([])
    }
  }

  const loadWards = async (districtCode: number) => {
    try {
      const res = await fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`)
      if (res.ok) {
        const district: DistrictOption = await res.json()
        setWards(district.wards ?? [])
      } else {
        setWards([])
      }
    } catch {
      setWards([])
    }
  }

  useEffect(() => {
    loadProvinces()
  }, [])

  useEffect(() => {
    if (addressDialogOpen) {
      loadProvinces()
    }
  }, [addressDialogOpen])

  useEffect(() => {
    if (selectedProvinceCode) {
      loadDistricts(selectedProvinceCode)
    } else {
      setDistricts([])
      setWards([])
      setSelectedDistrictCode(null)
      setSelectedWardCode(null)
      setAddressForm((p) => ({ ...p, district: "", ward: "" }))
    }
  }, [selectedProvinceCode])

  useEffect(() => {
    if (selectedDistrictCode) {
      loadWards(selectedDistrictCode)
    } else {
      setWards([])
      setSelectedWardCode(null)
      setAddressForm((p) => ({ ...p, ward: "" }))
    }
  }, [selectedDistrictCode])

  useEffect(() => {
    if (!addressDialogOpen) return
    if (editingAddress && provinces.length > 0 && addressForm.province && !selectedProvinceCode) {
      const p = provinces.find((x) => x.name === addressForm.province)
      if (p) setSelectedProvinceCode(p.code)
    }
  }, [addressDialogOpen, editingAddress, provinces, addressForm.province, selectedProvinceCode])

  useEffect(() => {
    if (!addressDialogOpen || !editingAddress) return
    if (districts.length > 0 && addressForm.district && !selectedDistrictCode) {
      const d = districts.find((x) => x.name === addressForm.district)
      if (d) setSelectedDistrictCode(d.code)
    }
  }, [addressDialogOpen, editingAddress, districts, addressForm.district, selectedDistrictCode])

  useEffect(() => {
    if (!addressDialogOpen || !editingAddress) return
    if (wards.length > 0 && addressForm.ward && !selectedWardCode) {
      const w = wards.find((x) => x.name === addressForm.ward)
      if (w) setSelectedWardCode(w.code)
    }
  }, [addressDialogOpen, editingAddress, wards, addressForm.ward, selectedWardCode])

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === "phone") {
      const digits = value.replace(/\D/g, "").slice(0, 10)
      const withLeadingZero = digits.length > 0 && digits[0] !== "0" ? "0" + digits.slice(0, 9) : digits
      setProfileData((prev) => ({ ...prev, phone: withLeadingZero }))
      if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: undefined }))
    } else {
      setProfileData((prev) => ({ ...prev, [name]: value }))
      if (name === "email" && fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }))
    }
  }

  const openAddAddress = () => {
    setEditingAddress(null)
    setSelectedProvinceCode(null)
    setSelectedDistrictCode(null)
    setSelectedWardCode(null)
    setDistricts([])
    setWards([])
    setAddressForm({
      receiver_name: user?.first_name ?? "",
      phone: user?.phone ?? "",
      address_line: "",
      ward: "",
      district: "",
      province: "",
      is_default: false,
    })
    setAddressDialogOpen(true)
  }

  const openEditAddress = (addr: AddressItem) => {
    setEditingAddress(addr)
    setSelectedProvinceCode(null)
    setSelectedDistrictCode(null)
    setSelectedWardCode(null)
    setDistricts([])
    setWards([])
    setAddressForm({
      receiver_name: addr.receiver_name,
      phone: addr.phone,
      address_line: addr.address_line,
      ward: addr.ward,
      district: addr.district,
      province: addr.province,
      is_default: !!addr.is_default,
    })
    setAddressDialogOpen(true)
  }

  const handleAddressFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const phoneNorm = addressForm.phone.trim().replace(/\D/g, "")
    if (!PHONE_REGEX.test(phoneNorm)) {
      toast.error("Số điện thoại phải bắt đầu bằng 0 và có đúng 10 chữ số")
      return
    }
    if (!addressForm.province.trim()) {
      toast.error("Vui lòng chọn Tỉnh/Thành phố")
      return
    }
    if (!addressForm.district.trim()) {
      toast.error("Vui lòng chọn Quận/Huyện")
      return
    }
    if (!addressForm.ward.trim()) {
      toast.error("Vui lòng chọn Phường/Xã")
      return
    }
    setAddressSaving(true)
    const payload: AddressPayload = {
      receiver_name: addressForm.receiver_name.trim(),
      phone: addressForm.phone.trim(),
      address_line: addressForm.address_line.trim(),
      ward: addressForm.ward.trim(),
      district: addressForm.district.trim(),
      province: addressForm.province.trim(),
      is_default: addressForm.is_default,
    }
    if (editingAddress) {
      const { ok, data } = await addressesApi.update(editingAddress.address_id, payload)
      setAddressSaving(false)
      if (ok) {
        toast.success("Đã cập nhật địa chỉ")
        setAddressDialogOpen(false)
        loadAddresses()
      } else {
        toast.error((data as { message?: string })?.message ?? "Không thể cập nhật")
      }
    } else {
      const { ok, data } = await addressesApi.create(payload)
      setAddressSaving(false)
      if (ok) {
        toast.success("Đã thêm địa chỉ")
        setAddressDialogOpen(false)
        loadAddresses()
      } else {
        toast.error((data as { message?: string })?.message ?? "Không thể thêm địa chỉ")
      }
    }
  }

  const handleSetDefaultAddress = async (id: number) => {
    const { ok } = await addressesApi.setDefault(id)
    if (ok) {
      toast.success("Đã đặt làm địa chỉ mặc định")
      loadAddresses()
    } else {
      toast.error("Không thể đặt địa chỉ mặc định")
    }
  }

  const handleConfirmDeleteAddress = async (id: number) => {
    const { ok } = await addressesApi.delete(id)
    setDeleteTargetId(null)
    if (ok) {
      toast.success("Đã xóa địa chỉ")
      setSelectedAddressIds((prev) => prev.filter((x) => x !== id))
      loadAddresses()
    } else {
      toast.error("Không thể xóa địa chỉ")
    }
  }

  const toggleSelectAddress = (id: number) => {
    setSelectedAddressIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const isAllAddressesSelected =
    addressesList.length > 0 && selectedAddressIds.length === addressesList.length

  const toggleSelectAllAddresses = () => {
    if (isAllAddressesSelected) {
      setSelectedAddressIds([])
    } else {
      setSelectedAddressIds(addressesList.map((a) => a.address_id))
    }
  }

  const handleBulkDeleteClick = () => {
    if (selectedAddressIds.length === 0) return
    setBulkDeleteIds([...selectedAddressIds])
  }

  const handleConfirmBulkDelete = async () => {
    if (!bulkDeleteIds || bulkDeleteIds.length === 0) {
      setBulkDeleteIds(null)
      return
    }
    setBulkDeleting(true)
    let failed = 0
    for (const id of bulkDeleteIds) {
      const { ok } = await addressesApi.delete(id)
      if (!ok) failed++
    }
    setBulkDeleting(false)
    setBulkDeleteIds(null)
    setSelectedAddressIds([])
    loadAddresses()
    if (failed === 0) {
      toast.success(`Đã xóa ${bulkDeleteIds.length} địa chỉ`)
    } else {
      toast.error(`Đã xóa ${bulkDeleteIds.length - failed} địa chỉ, ${failed} lỗi`)
    }
  }

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    const phoneNormalized = profileData.phone.trim().replace(/\D/g, "")
    const phoneValid = PHONE_REGEX.test(phoneNormalized)
    const emailValid = isValidEmail(profileData.email.trim())
    if (!emailValid) {
      setFieldErrors((prev) => ({ ...prev, email: "Email không đúng định dạng" }))
      toast.error("Vui lòng nhập đúng định dạng email")
      return
    }
    if (!phoneValid) {
      setFieldErrors((prev) => ({ ...prev, phone: "Số điện thoại phải bắt đầu bằng 0 và có đúng 10 chữ số" }))
      toast.error("Số điện thoại phải bắt đầu bằng 0 và có đúng 10 chữ số (ví dụ: 0912345678)")
      return
    }
    setSaving(true)
    const { ok, data } = await profileApi.updateProfile({
      first_name: profileData.firstName.trim(),
      last_name: profileData.lastName.trim(),
      email: profileData.email.trim(),
      phone: profileData.phone.trim(),
    })
    setSaving(false)
    if (ok && (data as { success?: boolean })?.success !== false) {
      toast.success("Đã lưu thông tin tài khoản")
      await loadProfile()
    } else {
      const errors = (data as { errors?: Record<string, string[]> })?.errors
      if (errors) {
        const next: { phone?: string; email?: string } = {}
        if (errors.phone?.[0]) next.phone = errors.phone[0]
        if (errors.email?.[0]) next.email = errors.email[0]
        setFieldErrors(next)
      }
      const msg = (data as { message?: string })?.message ?? "Không thể lưu thay đổi"
      toast.error(msg)
    }
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
                  {profileError && (
                    <p className="text-sm text-red-600 mb-4">{profileError}</p>
                  )}
                  <form className="space-y-6" onSubmit={handleSaveChanges}>
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
                        placeholder="example@gmail.com"
                      />
                      {fieldErrors.email && (
                        <p className="text-sm text-red-600">{fieldErrors.email}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="phone" className={labelClass}>
                        Phone
                      </label>
                      <Input
                        id="phone"
                        name="phone"
                        inputMode="numeric"
                        maxLength={10}
                        value={profileData.phone}
                        onChange={handleProfileChange}
                        className={inputClass}
                        placeholder="0912345678"
                      />
                      {fieldErrors.phone && (
                        <p className="text-sm text-red-600">{fieldErrors.phone}</p>
                      )}
                      <p className="text-xs text-black/60">
                        Tối đa 10 số, bắt đầu bằng 0 (ví dụ: 0912345678)
                      </p>
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
                      type="submit"
                      disabled={saving || profileLoading}
                      className="font-gotham text-xs font-bold uppercase tracking-wider bg-black text-white rounded-none hover:bg-black/90 disabled:opacity-60"
                    >
                      {saving ? "Đang lưu..." : "Save Changes"}
                    </Button>
                  </form>
                </div>
              </TabsContent>

              <TabsContent value="addresses" className="mt-0">
                <div className="space-y-6">
                  {addressesError && (
                    <p className="text-sm text-red-600">{addressesError}</p>
                  )}
                  {addressesLoading ? (
                    <p className="text-[15px] text-black/60">Đang tải địa chỉ...</p>
                  ) : (
                    <>
                      {addressesList.length > 0 && (
                        <div className="flex flex-wrap items-center gap-4 border-b border-black/10 pb-4">
                          <label className="flex cursor-pointer items-center gap-2 font-gotham text-sm">
                            <Checkbox
                              checked={isAllAddressesSelected}
                              onCheckedChange={toggleSelectAllAddresses}
                              className="rounded border-black/30"
                            />
                            Chọn tất cả
                          </label>
                          {selectedAddressIds.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="font-gotham text-xs uppercase tracking-wider rounded-none border-red-300 text-red-700"
                              onClick={handleBulkDeleteClick}
                            >
                              Xóa đã chọn ({selectedAddressIds.length})
                            </Button>
                          )}
                        </div>
                      )}
                      <div className="grid gap-6 md:grid-cols-2">
                        {addressesList.map((addr) => (
                          <div
                            key={addr.address_id}
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleSelectAddress(addr.address_id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                toggleSelectAddress(addr.address_id)
                              }
                            }}
                            className={cn(
                              "cursor-pointer rounded-sm border p-6 font-gotham transition-colors hover:bg-black/[0.02] focus:outline-none focus:ring-2 focus:ring-black/20",
                              selectedAddressIds.includes(addr.address_id)
                                ? "border-2 border-black bg-black/[0.02]"
                                : "border border-black/10 hover:border-black/20"
                            )}
                          >
                            <div className="mb-4 flex items-start justify-between gap-2">
                              <div className="flex min-w-0 flex-1 items-start gap-3">
                                <span onClick={(e) => e.stopPropagation()} className="shrink-0">
                                  <Checkbox
                                    checked={selectedAddressIds.includes(addr.address_id)}
                                    onCheckedChange={() => toggleSelectAddress(addr.address_id)}
                                    className="mt-0.5 rounded border-black/30"
                                  />
                                </span>
                                <h3 className="text-[17px] font-medium uppercase tracking-wider">
                                  {addr.receiver_name}
                                  {addr.is_default ? (
                                    <span className="ml-2 text-xs font-normal normal-case text-black/60">(Mặc định)</span>
                                  ) : null}
                                </h3>
                              </div>
                              <div className="flex shrink-0 gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="font-gotham text-xs uppercase tracking-wider rounded-none border-black/30"
                                  onClick={() => openEditAddress(addr)}
                                >
                                  Edit
                                </Button>
                                {!addr.is_default && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="font-gotham text-xs uppercase tracking-wider rounded-none border-black/30"
                                    onClick={() => handleSetDefaultAddress(addr.address_id)}
                                  >
                                    Đặt mặc định
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="font-gotham text-xs uppercase tracking-wider rounded-none border-red-300 text-red-700"
                                  onClick={() => setDeleteTargetId(addr.address_id)}
                                >
                                  Xóa
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-1 text-[15px] text-black/80 leading-[1.8]">
                              <p>{addr.receiver_name}</p>
                              <p>{addr.phone}</p>
                              <p>{addr.address_line}</p>
                              <p>{[addr.ward, addr.district, addr.province].filter(Boolean).join(", ")}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex h-full min-h-[120px] items-center justify-center border border-dashed border-black/20 p-6">
                        <Button
                          variant="outline"
                          className="font-gotham text-xs font-bold uppercase tracking-wider rounded-none border-black/30 hover:bg-black/5"
                          onClick={openAddAddress}
                        >
                          Add New Address
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
                  <DialogContent className="font-gotham max-w-4xl w-[95vw] sm:w-full">
                    <DialogHeader>
                      <DialogTitle className="uppercase tracking-wider">
                        {editingAddress ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ mới"}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddressFormSubmit} className="space-y-4">
                      <div>
                        <label className={labelClass}>Người nhận</label>
                        <Input
                          className={inputClass}
                          value={addressForm.receiver_name}
                          onChange={(e) => setAddressForm((p) => ({ ...p, receiver_name: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Số điện thoại</label>
                        <Input
                          className={inputClass}
                          value={addressForm.phone}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, "").slice(0, 10)
                            const withZero = v.length > 0 && v[0] !== "0" ? "0" + v.slice(0, 9) : v
                            setAddressForm((p) => ({ ...p, phone: withZero }))
                          }}
                          placeholder="0912345678"
                          required
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Địa chỉ</label>
                        <Input
                          className={inputClass}
                          value={addressForm.address_line}
                          onChange={(e) => setAddressForm((p) => ({ ...p, address_line: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                          <label className={labelClass}>Tỉnh/Thành phố</label>
                          <Popover open={provinceOpen} onOpenChange={setProvinceOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                aria-expanded={provinceOpen}
                                className={cn("w-full justify-between rounded-none border-black/20 font-gotham", inputClass)}
                              >
                                {selectedProvinceCode && provinces.find((p) => p.code === selectedProvinceCode)?.name
                                  ? provinces.find((p) => p.code === selectedProvinceCode)?.name
                                  : "Chọn Tỉnh/Thành phố"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="z-[100] w-[var(--radix-popover-trigger-width)] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Tìm tỉnh/thành phố..." />
                                <CommandList>
                                  <CommandEmpty>Không tìm thấy.</CommandEmpty>
                                  <CommandGroup>
                                    {provinces.map((province) => (
                                      <CommandItem
                                        key={province.code}
                                        value={province.name}
                                        onSelect={() => {
                                          setSelectedProvinceCode(province.code)
                                          setProvinceOpen(false)
                                          setAddressForm((p) => ({ ...p, province: province.name, district: "", ward: "" }))
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedProvinceCode === province.code ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {province.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <label className={labelClass}>Quận/Huyện</label>
                          <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                aria-expanded={districtOpen}
                                disabled={!selectedProvinceCode || districts.length === 0}
                                className={cn("w-full justify-between rounded-none border-black/20 font-gotham", inputClass)}
                              >
                                {selectedDistrictCode && districts.find((d) => d.code === selectedDistrictCode)?.name
                                  ? districts.find((d) => d.code === selectedDistrictCode)?.name
                                  : "Chọn Quận/Huyện"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="z-[100] w-[var(--radix-popover-trigger-width)] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Tìm quận/huyện..." />
                                <CommandList>
                                  <CommandEmpty>Không tìm thấy.</CommandEmpty>
                                  <CommandGroup>
                                    {districts.map((district) => (
                                      <CommandItem
                                        key={district.code}
                                        value={district.name}
                                        onSelect={() => {
                                          setSelectedDistrictCode(district.code)
                                          setDistrictOpen(false)
                                          setAddressForm((p) => ({ ...p, district: district.name, ward: "" }))
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedDistrictCode === district.code ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {district.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <label className={labelClass}>Phường/Xã</label>
                          <Popover open={wardOpen} onOpenChange={setWardOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                aria-expanded={wardOpen}
                                disabled={!selectedDistrictCode || wards.length === 0}
                                className={cn("w-full justify-between rounded-none border-black/20 font-gotham", inputClass)}
                              >
                                {selectedWardCode && wards.find((w) => w.code === selectedWardCode)?.name
                                  ? wards.find((w) => w.code === selectedWardCode)?.name
                                  : "Chọn Phường/Xã"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="z-[100] w-[var(--radix-popover-trigger-width)] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Tìm phường/xã..." />
                                <CommandList>
                                  <CommandEmpty>Không tìm thấy.</CommandEmpty>
                                  <CommandGroup>
                                    {wards.map((ward) => (
                                      <CommandItem
                                        key={ward.code}
                                        value={ward.name}
                                        onSelect={() => {
                                          setSelectedWardCode(ward.code)
                                          setWardOpen(false)
                                          setAddressForm((p) => ({ ...p, ward: ward.name }))
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedWardCode === ward.code ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {ward.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="addr-default"
                          checked={addressForm.is_default}
                          onChange={(e) => setAddressForm((p) => ({ ...p, is_default: e.target.checked }))}
                          className="rounded border-black/30"
                        />
                        <label htmlFor="addr-default" className="text-sm">Đặt làm địa chỉ mặc định</label>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setAddressDialogOpen(false)}>
                          Hủy
                        </Button>
                        <Button type="submit" disabled={addressSaving} className="bg-black text-white rounded-none">
                          {addressSaving ? "Đang lưu..." : editingAddress ? "Cập nhật" : "Thêm địa chỉ"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <AlertDialog
                  open={deleteTargetId !== null || (bulkDeleteIds !== null && bulkDeleteIds.length > 0)}
                  onOpenChange={(open) => {
                    if (!open) {
                      setDeleteTargetId(null)
                      setBulkDeleteIds(null)
                    }
                  }}
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {bulkDeleteIds && bulkDeleteIds.length > 0
                          ? `Xóa ${bulkDeleteIds.length} địa chỉ`
                          : "Xóa địa chỉ"}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {bulkDeleteIds && bulkDeleteIds.length > 0
                          ? `Bạn có chắc muốn xóa ${bulkDeleteIds.length} địa chỉ đã chọn?`
                          : "Bạn có chắc muốn xóa địa chỉ này?"}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={bulkDeleting}>Hủy</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          if (bulkDeleteIds && bulkDeleteIds.length > 0) {
                            handleConfirmBulkDelete()
                          } else if (deleteTargetId !== null) {
                            handleConfirmDeleteAddress(deleteTargetId)
                          }
                        }}
                        disabled={bulkDeleting}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {bulkDeleting ? "Đang xóa..." : "Xóa"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  )
}
