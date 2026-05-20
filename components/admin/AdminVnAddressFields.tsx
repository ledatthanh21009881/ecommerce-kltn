'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import AddressMapboxAutocomplete, { type MapboxParsedAddress } from '@/components/AddressMapboxAutocomplete'
import type { MapboxFeature } from '@/lib/mapbox-address'
import { applyResolvedVnAddressToForm, resolveMapboxToVnAdmin } from '@/lib/vn-admin-resolve'

export function isInsideAddressDropdown(target: unknown): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest('[data-address-picker]') || target.closest('[data-address-suggestions]')
  )
}

function normalizeAdminName(s: string): string {
  return s.trim().replace(/\s+/g, ' ')
}

function adminNamesEqual(a: string, b: string): boolean {
  return normalizeAdminName(a) === normalizeAdminName(b)
}

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

export type AdminAddressValue = {
  receiver_name: string
  phone: string
  address_line: string
  ward: string
  district: string
  province: string
  is_default: boolean
}

type Props = {
  value: AdminAddressValue
  onChange: (patch: Partial<AdminAddressValue>) => void
  /** Khi true: khớp tên tỉnh/quận/phường từ DB với mã API (màn sửa). */
  enableNameSync: boolean
  /** Phần tử DialogContent (Popover container), gán ref trên DialogContent ở parent. */
  dialogContentEl: HTMLElement | null
}

export function AdminVnAddressFields({ value, onChange, enableNameSync, dialogContentEl }: Props) {
  const { t } = useLanguage()

  const [provinces, setProvinces] = useState<ProvinceOption[]>([])
  const [districts, setDistricts] = useState<DistrictOption[]>([])
  const [wards, setWards] = useState<WardOption[]>([])
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<number | null>(null)
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<number | null>(null)
  const [selectedWardCode, setSelectedWardCode] = useState<number | null>(null)
  const [provinceOpen, setProvinceOpen] = useState(false)
  const [districtOpen, setDistrictOpen] = useState(false)
  const [wardOpen, setWardOpen] = useState(false)
  const handleMapboxPlaceSelect = async (_parsed: MapboxParsedAddress, feature: MapboxFeature) => {
    const resolved = await resolveMapboxToVnAdmin(feature, provinces)
    await applyResolvedVnAddressToForm(resolved, {
      setFormFields: (fields) =>
        onChange({
          address_line: fields.address_line,
          ward: fields.ward,
          district: fields.district,
          province: fields.province,
        }),
      setDistricts,
      setWards,
      setSelectedProvinceCode,
      setSelectedDistrictCode,
      setSelectedWardCode,
    })
  }

  const loadProvinces = async () => {
    try {
      const res = await fetch('https://provinces.open-api.vn/api/p/')
      if (res.ok) {
        const data: ProvinceOption[] = await res.json()
        setProvinces(data)
      }
    } catch {
      toast.error(t('account.err.loadProvinces'))
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
    if (selectedProvinceCode) {
      loadDistricts(selectedProvinceCode)
    } else {
      setDistricts([])
      setWards([])
      setSelectedDistrictCode(null)
      setSelectedWardCode(null)
    }
  }, [selectedProvinceCode])

  useEffect(() => {
    if (selectedDistrictCode) {
      loadWards(selectedDistrictCode)
    } else {
      setWards([])
      setSelectedWardCode(null)
    }
  }, [selectedDistrictCode])

  useEffect(() => {
    if (!enableNameSync) return
    if (provinces.length > 0 && value.province && !selectedProvinceCode) {
      const p = provinces.find((x) => adminNamesEqual(x.name, value.province))
      if (p) setSelectedProvinceCode(p.code)
    }
  }, [enableNameSync, provinces, value.province, selectedProvinceCode])

  useEffect(() => {
    if (!enableNameSync) return
    if (districts.length > 0 && value.district && !selectedDistrictCode) {
      const d = districts.find((x) => adminNamesEqual(x.name, value.district))
      if (d) setSelectedDistrictCode(d.code)
    }
  }, [enableNameSync, districts, value.district, selectedDistrictCode])

  useEffect(() => {
    if (!enableNameSync) return
    if (wards.length > 0 && value.ward && !selectedWardCode) {
      const w = wards.find((x) => adminNamesEqual(x.name, value.ward))
      if (w) setSelectedWardCode(w.code)
    }
  }, [enableNameSync, wards, value.ward, selectedWardCode])

  const labelCaps =
    'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600 [font-variant-numeric:lining-nums]'
  const fieldClass =
    'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/30'
  const comboTriggerClass =
    'h-10 w-full justify-between rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 shadow-sm hover:bg-slate-50'

  return (
    <div className="space-y-4 border-t border-slate-200 pt-5 mt-2">
      <p className="text-sm font-semibold text-slate-800">{t('adminUserAddressSection')}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="admin-addr-receiver" className={labelCaps}>
            {t('account.field.receiver')}
          </Label>
          <Input
            id="admin-addr-receiver"
            value={value.receiver_name}
            onChange={(e) => onChange({ receiver_name: e.target.value })}
            className={fieldClass}
          />
        </div>
        <div>
          <Label htmlFor="admin-addr-phone" className={labelCaps}>
            {t('account.phone')}
          </Label>
          <Input
            id="admin-addr-phone"
            value={value.phone}
            autoComplete="off"
            inputMode="numeric"
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 10)
              const withZero = v.length > 0 && v[0] !== '0' ? '0' + v.slice(0, 9) : v
              onChange({ phone: withZero })
            }}
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="admin-addr-line" className={labelCaps}>
          {t('adminUserAddressStreetLabel')}
        </label>
        <AddressMapboxAutocomplete
          id="admin-addr-line"
          value={value.address_line}
          onValueChange={(address_line) => onChange({ address_line })}
          onPlaceSelect={handleMapboxPlaceSelect}
          inputClassName={fieldClass}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <span className={labelCaps}>{t('account.field.province')}</span>
          <Popover open={provinceOpen} onOpenChange={setProvinceOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={provinceOpen}
                className={comboTriggerClass}
              >
                {selectedProvinceCode && provinces.find((p) => p.code === selectedProvinceCode)?.name
                  ? provinces.find((p) => p.code === selectedProvinceCode)?.name
                  : t('account.field.pickProvince')}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              container={dialogContentEl ?? undefined}
              data-address-picker
              className="z-[100] w-[var(--radix-popover-trigger-width)] max-h-[min(320px,var(--radix-popover-content-available-height))] p-0"
              align="start"
              onPointerDownOutside={(e) => {
                if (isInsideAddressDropdown(e.target)) e.preventDefault()
              }}
              onInteractOutside={(e) => {
                if (isInsideAddressDropdown(e.target)) e.preventDefault()
              }}
            >
              <Command>
                <CommandInput placeholder={t('account.field.searchProvince')} />
                <CommandList>
                  <CommandEmpty>{t('account.field.cmdEmpty')}</CommandEmpty>
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
                          onChange({ province: province.name, district: '', ward: '' })
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedProvinceCode === province.code ? 'opacity-100' : 'opacity-0'
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
          <span className={labelCaps}>{t('account.field.district')}</span>
          <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={districtOpen}
                disabled={!selectedProvinceCode || districts.length === 0}
                className={comboTriggerClass}
              >
                {selectedDistrictCode && districts.find((d) => d.code === selectedDistrictCode)?.name
                  ? districts.find((d) => d.code === selectedDistrictCode)?.name
                  : t('account.field.pickDistrict')}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              container={dialogContentEl ?? undefined}
              data-address-picker
              className="z-[100] w-[var(--radix-popover-trigger-width)] max-h-[min(320px,var(--radix-popover-content-available-height))] p-0"
              align="start"
              onPointerDownOutside={(e) => {
                if (isInsideAddressDropdown(e.target)) e.preventDefault()
              }}
              onInteractOutside={(e) => {
                if (isInsideAddressDropdown(e.target)) e.preventDefault()
              }}
            >
              <Command>
                <CommandInput placeholder={t('account.field.searchDistrict')} />
                <CommandList>
                  <CommandEmpty>{t('account.field.cmdEmpty')}</CommandEmpty>
                  <CommandGroup>
                    {districts.map((district) => (
                      <CommandItem
                        key={district.code}
                        value={district.name}
                        onSelect={() => {
                          setSelectedDistrictCode(district.code)
                          setSelectedWardCode(null)
                          setDistrictOpen(false)
                          onChange({ district: district.name, ward: '' })
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedDistrictCode === district.code ? 'opacity-100' : 'opacity-0'
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
          <span className={labelCaps}>{t('account.field.ward')}</span>
          <Popover open={wardOpen} onOpenChange={setWardOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={wardOpen}
                disabled={!selectedDistrictCode || wards.length === 0}
                className={comboTriggerClass}
              >
                {selectedWardCode && wards.find((w) => w.code === selectedWardCode)?.name
                  ? wards.find((w) => w.code === selectedWardCode)?.name
                  : t('account.field.pickWard')}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              container={dialogContentEl ?? undefined}
              data-address-picker
              className="z-[100] w-[var(--radix-popover-trigger-width)] max-h-[min(320px,var(--radix-popover-content-available-height))] p-0"
              align="start"
              onPointerDownOutside={(e) => {
                if (isInsideAddressDropdown(e.target)) e.preventDefault()
              }}
              onInteractOutside={(e) => {
                if (isInsideAddressDropdown(e.target)) e.preventDefault()
              }}
            >
              <Command>
                <CommandInput placeholder={t('account.field.searchWard')} />
                <CommandList>
                  <CommandEmpty>{t('account.field.cmdEmpty')}</CommandEmpty>
                  <CommandGroup>
                    {wards.map((ward) => (
                      <CommandItem
                        key={ward.code}
                        value={ward.name}
                        onSelect={() => {
                          setSelectedWardCode(ward.code)
                          setWardOpen(false)
                          onChange({ ward: ward.name })
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedWardCode === ward.code ? 'opacity-100' : 'opacity-0'
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
          id="admin-addr-default"
          checked={value.is_default}
          onChange={(e) => onChange({ is_default: e.target.checked })}
          className="rounded border-slate-300"
        />
        <label htmlFor="admin-addr-default" className="text-sm text-slate-700">
          {t('account.checkbox.defaultAddress')}
        </label>
      </div>
    </div>
  )
}
