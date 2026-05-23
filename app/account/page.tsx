"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useLanguage } from "@/components/language-provider"
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
import AddressMapboxAutocomplete from "@/components/AddressMapboxAutocomplete"
import type { MapboxFeature, MapboxParsedAddress } from "@/lib/mapbox-address"
import { applyResolvedVnAddressToForm, resolveMapboxToVnAdmin } from "@/lib/vn-admin-resolve"
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
import { storefrontMainClass } from "@/components/storefront/storefront-layout"

interface ProvinceOption {
  name: string
  code: number
  districts?: DistrictOption[]
}

/** Combobox/popover được portal ra ngoài Dialog — không preventDefault sẽ bị Modal chặn focus & cuộn. */
function isInsideAddressDropdown(target: unknown): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest("[data-address-picker]") || target.closest("[data-address-suggestions]")
  )
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

/** Chuẩn hóa tên địa giới hành chính để khớp với provinces.open-api.vn / DB. */
function normalizeAdminName(s: string): string {
  return s.trim().replace(/\s+/g, " ")
}

/** Chỉ khớp đúng chuỗi sau chuẩn hóa — tránh includes() gây nhầm Quận 12 ↔ Quận 1, Phường 10 ↔ Phường 1. */
function adminNamesEqual(a: string, b: string): boolean {
  return normalizeAdminName(a) === normalizeAdminName(b)
}

const contentClass =
  "font-gotham text-black text-[17px] leading-[1.8] space-y-6"
const labelClass = "font-gotham text-[17px] text-black uppercase tracking-wider block mb-2"
const inputClass = "font-gotham text-[17px] border-black/20 rounded-none focus-visible:ring-black/30"

export default function AccountPage() {
  const { t } = useLanguage()
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
    lat: null,
    lng: null,
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
  /** Dropdown định vị trong Dialog — tránh FocusScope Dialog đẩy focus khỏi ô search Cmdk */
  const [addressDialogContentEl, setAddressDialogContentEl] = useState<HTMLElement | null>(null)
  const bindAddressDialogContentRef = useCallback((node: HTMLElement | null) => {
    setAddressDialogContentEl((prev) => (prev === node ? prev : node))
  }, [])

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
        setProfileError((data as { message?: string })?.message ?? t("account.err.loadProfile"))
      }
    }
  }

  const loadOrders = async () => {
    setOrdersLoading(true)
    setOrdersError(null)
    const { ok, data } = await userOrdersApi.getOrders()
    setOrdersLoading(false)
    if (!ok) {
      setOrdersError((data as { message?: string })?.message ?? t("account.err.loadOrders"))
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
      setAddressesError((data as { message?: string })?.message ?? t("account.err.loadAddresses"))
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
      toast.error(t("account.err.loadProvinces"))
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
      // Không xóa addressForm.district/ward ở đây: lúc mở dialog sửa, code tỉnh còn null
      // một nhịp — nếu clear form sẽ mất tên quận/phường cũ trước khi sync được mã.
      // Khi user đổi tỉnh trong combobox, onSelect đã clear district/ward.
    }
  }, [selectedProvinceCode])

  useEffect(() => {
    if (selectedDistrictCode) {
      loadWards(selectedDistrictCode)
    } else {
      setWards([])
      setSelectedWardCode(null)
      // Không clear addressForm.ward — cùng lý do sync khi mở sửa địa chỉ.
      // Khi user đổi quận, onSelect đã clear ward.
    }
  }, [selectedDistrictCode])

  useEffect(() => {
    if (!addressDialogOpen) return
    if (editingAddress && provinces.length > 0 && addressForm.province && !selectedProvinceCode) {
      const want = addressForm.province
      const p = provinces.find((x) => adminNamesEqual(x.name, want))
      if (p) setSelectedProvinceCode(p.code)
    }
  }, [addressDialogOpen, editingAddress, provinces, addressForm.province, selectedProvinceCode])

  useEffect(() => {
    if (!addressDialogOpen || !editingAddress) return
    if (districts.length > 0 && addressForm.district && !selectedDistrictCode) {
      const want = addressForm.district
      const d = districts.find((x) => adminNamesEqual(x.name, want))
      if (d) setSelectedDistrictCode(d.code)
    }
  }, [addressDialogOpen, editingAddress, districts, addressForm.district, selectedDistrictCode])

  useEffect(() => {
    if (!addressDialogOpen || !editingAddress) return
    if (wards.length > 0 && addressForm.ward && !selectedWardCode) {
      const want = addressForm.ward
      const w = wards.find((x) => adminNamesEqual(x.name, want))
      if (w) setSelectedWardCode(w.code)
    }
  }, [addressDialogOpen, editingAddress, wards, addressForm.ward, selectedWardCode])

  const handleMapboxPlaceSelect = async (_parsed: MapboxParsedAddress, feature: MapboxFeature) => {
    const resolved = await resolveMapboxToVnAdmin(feature, provinces)
    await applyResolvedVnAddressToForm(resolved, {
      setFormFields: (fields) =>
        setAddressForm((p) => ({
          ...p,
          address_line: fields.address_line,
          ward: fields.ward,
          district: fields.district,
          province: fields.province,
          lat: fields.lat ?? null,
          lng: fields.lng ?? null,
        })),
      setDistricts,
      setWards,
      setSelectedProvinceCode,
      setSelectedDistrictCode,
      setSelectedWardCode,
    })
  }

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
      lat: null,
      lng: null,
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
      lat: addr.lat ?? null,
      lng: addr.lng ?? null,
    })
    setAddressDialogOpen(true)
  }

  const handleAddressFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const phoneNorm = addressForm.phone.trim().replace(/\D/g, "")
    if (!PHONE_REGEX.test(phoneNorm)) {
      toast.error(t("account.err.phoneAddress"))
      return
    }
    if (!addressForm.province.trim()) {
      toast.error(t("account.err.pickProvince"))
      return
    }
    if (!addressForm.district.trim()) {
      toast.error(t("account.err.pickDistrict"))
      return
    }
    if (!addressForm.ward.trim()) {
      toast.error(t("account.err.pickWard"))
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
      lat: addressForm.lat ?? undefined,
      lng: addressForm.lng ?? undefined,
    }
    if (editingAddress) {
      const { ok, data } = await addressesApi.update(editingAddress.address_id, payload)
      setAddressSaving(false)
      if (ok) {
        toast.success(t("account.success.addressUpdated"))
        setAddressDialogOpen(false)
        loadAddresses()
      } else {
        toast.error((data as { message?: string })?.message ?? t("account.err.addressUpdateFailed"))
      }
    } else {
      const { ok, data } = await addressesApi.create(payload)
      setAddressSaving(false)
      if (ok) {
        toast.success(t("account.success.addressAdded"))
        setAddressDialogOpen(false)
        loadAddresses()
      } else {
        toast.error((data as { message?: string })?.message ?? t("account.err.addressAddFailed"))
      }
    }
  }

  const handleSetDefaultAddress = async (id: number) => {
    const { ok } = await addressesApi.setDefault(id)
    if (ok) {
      toast.success(t("account.success.defaultSet"))
      loadAddresses()
    } else {
      toast.error(t("account.err.defaultFailed"))
    }
  }

  const handleConfirmDeleteAddress = async (id: number) => {
    const { ok } = await addressesApi.delete(id)
    setDeleteTargetId(null)
    if (ok) {
      toast.success(t("account.success.addressDeleted"))
      setSelectedAddressIds((prev) => prev.filter((x) => x !== id))
      loadAddresses()
    } else {
      toast.error(t("account.err.addressDeleteFailed"))
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
    const idsToDelete = [...bulkDeleteIds]
    const totalCount = idsToDelete.length
    setBulkDeleting(true)
    let failed = 0
    for (const id of idsToDelete) {
      const { ok } = await addressesApi.delete(id)
      if (!ok) failed++
    }
    setBulkDeleting(false)
    setBulkDeleteIds(null)
    setSelectedAddressIds([])
    loadAddresses()
    if (failed === 0) {
      toast.success(t("account.success.bulkDeleted").replace("{{n}}", String(totalCount)))
    } else {
      const okCount = totalCount - failed
      toast.error(
        t("account.err.bulkPartial")
          .replace("{{ok}}", String(okCount))
          .replace("{{fail}}", String(failed)),
      )
    }
  }

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    const phoneNormalized = profileData.phone.trim().replace(/\D/g, "")
    const phoneValid = PHONE_REGEX.test(phoneNormalized)
    const emailValid = isValidEmail(profileData.email.trim())
    if (!emailValid) {
      setFieldErrors((prev) => ({ ...prev, email: t("account.err.emailFormat") }))
      toast.error(t("account.err.emailInvalid"))
      return
    }
    if (!phoneValid) {
      setFieldErrors((prev) => ({ ...prev, phone: t("account.err.phoneProfile") }))
      toast.error(t("account.err.phoneProfile"))
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
      toast.success(t("account.success.profileSaved"))
      await loadProfile()
    } else {
      const errors = (data as { errors?: Record<string, string[]> })?.errors
      if (errors) {
        const next: { phone?: string; email?: string } = {}
        if (errors.phone?.[0]) next.phone = errors.phone[0]
        if (errors.email?.[0]) next.email = errors.email[0]
        setFieldErrors(next)
      }
      const msg = (data as { message?: string })?.message ?? t("account.err.saveFailed")
      toast.error(msg)
    }
  }

  return (
    <ProtectedRoute>
      <main className="min-h-screen">
        <div
          className={storefrontMainClass('font-gotham')}
          style={{ fontFamily: "SVN-Gotham" }}
        >
          <div className={contentClass} style={{ fontFamily: "SVN-Gotham" }}>
            <h1 className="font-gotham text-xl sm:text-2xl font-bold uppercase tracking-wider text-black mb-6 sm:mb-8">
              {t("account.title")}
            </h1>

            <Tabs defaultValue="orders" className="w-full">
              <TabsList className="mb-6 sm:mb-8 grid h-auto w-full grid-cols-3 border-b border-black/20 bg-transparent p-0">
                <TabsTrigger
                  value="orders"
                  className="font-gotham text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-none border-b-2 border-transparent pb-3 pt-0 px-1 sm:px-2 data-[state=active]:border-black data-[state=active]:text-black text-black/70 whitespace-normal text-center leading-tight"
                >
                  {t("account.tabOrders")}
                </TabsTrigger>
                <TabsTrigger
                  value="profile"
                  className="font-gotham text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-none border-b-2 border-transparent pb-3 pt-0 px-1 sm:px-2 data-[state=active]:border-black data-[state=active]:text-black text-black/70 whitespace-normal text-center leading-tight"
                >
                  {t("account.tabProfile")}
                </TabsTrigger>
                <TabsTrigger
                  value="addresses"
                  className="font-gotham text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-none border-b-2 border-transparent pb-3 pt-0 px-1 sm:px-2 data-[state=active]:border-black data-[state=active]:text-black text-black/70 whitespace-normal text-center leading-tight"
                >
                  {t("account.tabAddresses")}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label htmlFor="firstName" className={labelClass}>
                          {t("account.firstName")}
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
                          {t("account.lastName")}
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
                        {t("account.email")}
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={profileData.email}
                        onChange={handleProfileChange}
                        className={inputClass}
                        placeholder={t("account.emailPlaceholder")}
                      />
                      {fieldErrors.email && (
                        <p className="text-sm text-red-600">{fieldErrors.email}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="phone" className={labelClass}>
                        {t("account.phone")}
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
                      <p className="text-xs text-black/60">{t("account.phoneHint")}</p>
                    </div>

                    <div className="border-t border-black/10 pt-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="font-gotham text-base sm:text-[17px] font-medium uppercase tracking-wider">
                            {t("account.passwordSection")}
                          </h3>
                          <p className="text-sm sm:text-[15px] text-black/60 mt-1">
                            {t("account.passwordChangeHint")}
                          </p>
                        </div>
                        <Link href="/change-password" className="shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="font-gotham w-full sm:w-auto text-xs font-bold uppercase tracking-wider rounded-none border-black/30 hover:bg-black/5"
                          >
                            {t("account.changePasswordBtn")}
                          </Button>
                        </Link>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={saving || profileLoading}
                      className="font-gotham text-xs font-bold uppercase tracking-wider bg-black text-white rounded-none hover:bg-black/90 disabled:opacity-60"
                    >
                      {saving ? t("account.saving") : t("account.saveChanges")}
                    </Button>
                  </form>
                </div>
              </TabsContent>

              <TabsContent value="addresses" className="mt-0 min-w-0 overflow-x-hidden">
                <div className="space-y-6 min-w-0">
                  {addressesError && (
                    <p className="text-sm text-red-600">{addressesError}</p>
                  )}
                  {addressesLoading ? (
                    <p className="text-[15px] text-black/60">{t("account.addressesLoading")}</p>
                  ) : (
                    <>
                      {addressesList.length > 0 && (
                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 border-b border-black/10 pb-4">
                          <label className="flex cursor-pointer items-center gap-2 font-gotham text-sm">
                            <Checkbox
                              checked={isAllAddressesSelected}
                              onCheckedChange={toggleSelectAllAddresses}
                              className="rounded border-black/30"
                            />
                            {t("account.selectAll")}
                          </label>
                          {selectedAddressIds.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="font-gotham text-xs uppercase tracking-wider rounded-none border-red-300 text-red-700"
                              onClick={handleBulkDeleteClick}
                            >
                              {t("account.deleteSelected")} ({selectedAddressIds.length})
                            </Button>
                          )}
                        </div>
                      )}
                      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
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
                              "cursor-pointer rounded-sm border p-4 sm:p-6 font-gotham transition-colors hover:bg-black/[0.02] focus:outline-none focus:ring-2 focus:ring-black/20 min-w-0 overflow-hidden",
                              selectedAddressIds.includes(addr.address_id)
                                ? "border-2 border-black bg-black/[0.02]"
                                : "border border-black/10 hover:border-black/20"
                            )}
                          >
                            <div className="mb-4 flex flex-col gap-3">
                              <div className="flex min-w-0 items-start gap-3">
                                <span onClick={(e) => e.stopPropagation()} className="shrink-0">
                                  <Checkbox
                                    checked={selectedAddressIds.includes(addr.address_id)}
                                    onCheckedChange={() => toggleSelectAddress(addr.address_id)}
                                    className="mt-0.5 rounded border-black/30"
                                  />
                                </span>
                                <h3 className="min-w-0 flex-1 text-base sm:text-[17px] font-medium uppercase tracking-wide break-words leading-snug">
                                  {addr.receiver_name}
                                  {addr.is_default ? (
                                    <span className="mt-1 block text-xs font-normal normal-case text-black/60 sm:ml-2 sm:mt-0 sm:inline">
                                      {t("account.defaultBadge")}
                                    </span>
                                  ) : null}
                                </h3>
                              </div>
                              <div
                                className="flex flex-wrap gap-2 w-full pl-9 sm:pl-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="font-gotham h-9 flex-1 min-w-[4.5rem] sm:flex-none text-[10px] sm:text-xs uppercase tracking-wider rounded-none border-black/30 px-2 sm:px-3"
                                  onClick={() => openEditAddress(addr)}
                                >
                                  {t("account.edit")}
                                </Button>
                                {!addr.is_default && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="font-gotham h-9 flex-1 min-w-0 sm:flex-none text-[10px] sm:text-xs uppercase tracking-wider rounded-none border-black/30 px-2 sm:px-3 whitespace-normal leading-tight"
                                    onClick={() => handleSetDefaultAddress(addr.address_id)}
                                  >
                                    <span className="sm:hidden">{t("account.setDefaultShort")}</span>
                                    <span className="hidden sm:inline">{t("account.setDefault")}</span>
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="font-gotham h-9 flex-1 min-w-[4.5rem] sm:flex-none text-[10px] sm:text-xs uppercase tracking-wider rounded-none border-red-300 text-red-700 px-2 sm:px-3"
                                  onClick={() => setDeleteTargetId(addr.address_id)}
                                >
                                  {t("common.delete")}
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-1 pl-9 sm:pl-0 text-sm sm:text-[15px] text-black/80 leading-relaxed break-words">
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
                          {t("account.addNewAddress")}
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                <Dialog
                  open={addressDialogOpen}
                  onOpenChange={(open) => {
                    setAddressDialogOpen(open)
                    if (!open) setAddressDialogContentEl(null)
                  }}
                >
                  <DialogContent
                    ref={bindAddressDialogContentRef}
                    className="font-gotham max-w-4xl w-[95vw] sm:w-full overflow-visible"
                    onPointerDownOutside={(e) => {
                      if (isInsideAddressDropdown(e.target)) e.preventDefault()
                    }}
                    onInteractOutside={(e) => {
                      if (isInsideAddressDropdown(e.target)) e.preventDefault()
                    }}
                    onFocusOutside={(e) => {
                      const rt = (
                        e as unknown as CustomEvent<{ originalEvent?: FocusEvent | null }>
                      ).detail?.originalEvent?.relatedTarget
                      if (rt != null && isInsideAddressDropdown(rt)) e.preventDefault()
                    }}
                  >
                    <DialogHeader>
                      <DialogTitle className="uppercase tracking-wider">
                        {editingAddress ? t("account.dialog.editAddress") : t("account.dialog.addAddress")}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddressFormSubmit} className="space-y-4">
                      <div>
                        <label className={labelClass}>{t("account.field.receiver")}</label>
                        <Input
                          className={inputClass}
                          value={addressForm.receiver_name}
                          onChange={(e) => setAddressForm((p) => ({ ...p, receiver_name: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className={labelClass}>{t("account.phone")}</label>
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
                        <label className={labelClass}>{t("account.field.addressLine")}</label>
                        <AddressMapboxAutocomplete
                          value={addressForm.address_line}
                          onValueChange={(address_line) =>
                            setAddressForm((p) => ({ ...p, address_line }))
                          }
                          onPlaceSelect={handleMapboxPlaceSelect}
                          inputClassName={inputClass}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                          <label className={labelClass}>{t("account.field.province")}</label>
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
                                  : t("account.field.pickProvince")}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              container={addressDialogContentEl}
                              data-address-picker
                              className="z-[100] w-[var(--radix-popover-trigger-width)] max-h-[min(320px,var(--radix-popover-content-available-height))] p-0"
                              align="start"
                            >
                              <Command>
                                <CommandInput placeholder={t("account.field.searchProvince")} />
                                <CommandList>
                                  <CommandEmpty>{t("account.field.cmdEmpty")}</CommandEmpty>
                                  <CommandGroup>
                                    {provinces.map((province) => (
                                      <CommandItem
                                        key={province.code}
                                        value={province.name}
                                        onSelect={() => {
                                          setSelectedProvinceCode(province.code)
                                          setSelectedDistrictCode(null)
                                          setSelectedWardCode(null)
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
                          <label className={labelClass}>{t("account.field.district")}</label>
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
                                  : t("account.field.pickDistrict")}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              container={addressDialogContentEl}
                              data-address-picker
                              className="z-[100] w-[var(--radix-popover-trigger-width)] max-h-[min(320px,var(--radix-popover-content-available-height))] p-0"
                              align="start"
                            >
                              <Command>
                                <CommandInput placeholder={t("account.field.searchDistrict")} />
                                <CommandList>
                                  <CommandEmpty>{t("account.field.cmdEmpty")}</CommandEmpty>
                                  <CommandGroup>
                                    {districts.map((district) => (
                                      <CommandItem
                                        key={district.code}
                                        value={district.name}
                                        onSelect={() => {
                                          setSelectedDistrictCode(district.code)
                                          setSelectedWardCode(null)
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
                          <label className={labelClass}>{t("account.field.ward")}</label>
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
                                  : t("account.field.pickWard")}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              container={addressDialogContentEl}
                              data-address-picker
                              className="z-[100] w-[var(--radix-popover-trigger-width)] max-h-[min(320px,var(--radix-popover-content-available-height))] p-0"
                              align="start"
                            >
                              <Command>
                                <CommandInput placeholder={t("account.field.searchWard")} />
                                <CommandList>
                                  <CommandEmpty>{t("account.field.cmdEmpty")}</CommandEmpty>
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
                        <label htmlFor="addr-default" className="text-sm">
                          {t("account.checkbox.defaultAddress")}
                        </label>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setAddressDialogOpen(false)}>
                          {t("common.cancel")}
                        </Button>
                        <Button type="submit" disabled={addressSaving} className="bg-black text-white rounded-none">
                          {addressSaving
                            ? t("account.saving")
                            : editingAddress
                              ? t("account.dialog.updateBtn")
                              : t("account.dialog.addSubmitBtn")}
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
                          ? t("account.confirm.deleteBulkTitle").replace(
                              "{{n}}",
                              String(bulkDeleteIds.length),
                            )
                          : t("account.confirm.deleteTitle")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {bulkDeleteIds && bulkDeleteIds.length > 0
                          ? t("account.confirm.deleteBulkDesc").replace(
                              "{{n}}",
                              String(bulkDeleteIds.length),
                            )
                          : t("account.confirm.deleteDesc")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={bulkDeleting}>{t("common.cancel")}</AlertDialogCancel>
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
                        {bulkDeleting ? t("account.confirm.deleting") : t("common.delete")}
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
