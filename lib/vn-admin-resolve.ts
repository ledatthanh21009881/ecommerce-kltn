/**
 * Map Mapbox place + open-api.vn hierarchy → province / district / ward (+ codes).
 */

import {
  extractMapboxAdminCandidates,
  enrichParsedFromMapbox,
  vnAdminNamesMatch,
  type MapboxFeature,
  type MapboxParsedAddress,
} from '@/lib/mapbox-address'

export type VnProvinceOption = { name: string; code: number }
export type VnDistrictOption = {
  name: string
  code: number
  province_code: number
  wards?: VnWardOption[]
}
export type VnWardOption = { name: string; code: number; district_code: number }
export type VnProvinceTree = VnProvinceOption & { districts?: VnDistrictOption[] }

export type ResolvedVnAddress = MapboxParsedAddress & {
  provinceCode: number | null
  districtCode: number | null
  wardCode: number | null
}

const provinceTreeCache = new Map<number, VnProvinceTree>()

export function findProvinceByName(
  provinces: VnProvinceOption[],
  ...names: string[]
): VnProvinceOption | undefined {
  for (const raw of names) {
    if (!raw?.trim()) continue
    const hit = provinces.find((p) => vnAdminNamesMatch(p.name, raw))
    if (hit) return hit
  }
  return undefined
}

export async function loadProvinceAdminTree(provinceCode: number): Promise<VnProvinceTree | null> {
  const cached = provinceTreeCache.get(provinceCode)
  if (cached) return cached

  try {
    const res = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=3`)
    if (!res.ok) {
      const res2 = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`)
      if (!res2.ok) return null
      const data = (await res2.json()) as VnProvinceTree
      provinceTreeCache.set(provinceCode, data)
      return data
    }
    const data = (await res.json()) as VnProvinceTree
    provinceTreeCache.set(provinceCode, data)
    return data
  } catch {
    return null
  }
}

function findInTree(
  tree: VnProvinceTree,
  candidates: string[],
  districtHint: string
): { district: VnDistrictOption; ward: VnWardOption } | { district: VnDistrictOption; ward: null } | null {
  const districts = tree.districts ?? []
  const districtCandidates = districtHint ? [districtHint, ...candidates] : candidates

  // 1) Ward match (scan all districts)
  for (const district of districts) {
    for (const ward of district.wards ?? []) {
      for (const c of candidates) {
        if (vnAdminNamesMatch(ward.name, c)) {
          return { district, ward }
        }
      }
    }
  }

  // 2) District-only match
  for (const district of districts) {
    for (const c of districtCandidates) {
      if (vnAdminNamesMatch(district.name, c)) {
        return { district, ward: null }
      }
    }
  }

  return null
}

/**
 * Resolve a Mapbox feature to canonical VN admin names + open-api codes.
 */
export async function resolveMapboxToVnAdmin(
  feature: MapboxFeature,
  provinces: VnProvinceOption[]
): Promise<ResolvedVnAddress> {
  const parsed = await enrichParsedFromMapbox(feature)
  const candidates = extractMapboxAdminCandidates(feature, parsed)

  const base: ResolvedVnAddress = {
    ...parsed,
    provinceCode: null,
    districtCode: null,
    wardCode: null,
  }

  const prov = findProvinceByName(provinces, parsed.province, ...candidates)
  if (!prov) return base

  base.province = prov.name
  base.provinceCode = prov.code

  const tree = await loadProvinceAdminTree(prov.code)
  if (!tree?.districts?.length) {
    if (parsed.district) base.district = parsed.district
    if (parsed.ward) base.ward = parsed.ward
    return base
  }

  const hit = findInTree(tree, candidates, parsed.district)
  if (hit) {
    base.district = hit.district.name
    base.districtCode = hit.district.code
    if (hit.ward) {
      base.ward = hit.ward.name
      base.wardCode = hit.ward.code
    } else if (parsed.ward) {
      base.ward = parsed.ward
    }
    return base
  }

  if (parsed.district) base.district = parsed.district
  if (parsed.ward) base.ward = parsed.ward
  return base
}

export type ApplyResolvedCallbacks = {
  setFormFields: (fields: {
    address_line: string
    ward: string
    district: string
    province: string
    lat?: number
    lng?: number
  }) => void
  setDistricts: (districts: VnDistrictOption[]) => void
  setWards: (wards: VnWardOption[]) => void
  setSelectedProvinceCode: (code: number | null) => void
  setSelectedDistrictCode: (code: number | null) => void
  setSelectedWardCode: (code: number | null) => void
}

/** Apply resolved admin + preload combobox lists (avoids race with async district load). */
export async function applyResolvedVnAddressToForm(
  resolved: ResolvedVnAddress,
  callbacks: ApplyResolvedCallbacks
): Promise<void> {
  callbacks.setFormFields({
    address_line: resolved.address_line,
    ward: resolved.ward,
    district: resolved.district,
    province: resolved.province,
    lat: resolved.lat,
    lng: resolved.lng,
  })

  if (!resolved.provinceCode) {
    callbacks.setSelectedProvinceCode(null)
    callbacks.setSelectedDistrictCode(null)
    callbacks.setSelectedWardCode(null)
    callbacks.setDistricts([])
    callbacks.setWards([])
    return
  }

  const tree = await loadProvinceAdminTree(resolved.provinceCode)
  callbacks.setDistricts(tree?.districts ?? [])
  callbacks.setSelectedProvinceCode(resolved.provinceCode)

  if (resolved.districtCode) {
    callbacks.setSelectedDistrictCode(resolved.districtCode)
    const dist = tree?.districts?.find((d) => d.code === resolved.districtCode)
    callbacks.setWards(dist?.wards ?? [])
  } else {
    callbacks.setSelectedDistrictCode(null)
    callbacks.setWards([])
  }

  if (resolved.wardCode) {
    callbacks.setSelectedWardCode(resolved.wardCode)
  } else {
    callbacks.setSelectedWardCode(null)
  }
}
