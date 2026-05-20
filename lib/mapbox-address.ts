/**
 * Mapbox Geocoding — Vietnam address autocomplete & parsing.
 */

export type MapboxParsedAddress = {
  address_line: string
  ward: string
  district: string
  province: string
  lat: number
  lng: number
  place_name: string
}

type MapboxContextItem = { id: string; text: string; short_code?: string }

export type MapboxFeature = {
  id: string
  place_name: string
  text: string
  address?: string
  center: [number, number]
  context?: MapboxContextItem[]
  place_type?: string[]
}

type MapboxGeocodeResponse = {
  features?: MapboxFeature[]
}

const MAPBOX_TOKEN =
  typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '' : ''

/** Normalize admin names for matching open-api.vn / DB. */
export function normalizeVnAdminName(s: string): string {
  let n = s
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(Thành phố|Tỉnh|TP\.?|T\.)\s+/i, '')
    .replace(/^(Quận|Huyện|Q\.|H\.)\s*/i, '')
    .replace(/^(Phường|Xã|Thị trấn|P\.|X\.)\s*/i, '')
  return n
}

export function vnAdminNamesMatch(a: string, b: string): boolean {
  const na = normalizeVnAdminName(a).toLowerCase()
  const nb = normalizeVnAdminName(b).toLowerCase()
  if (!na || !nb) return false
  if (na === nb) return true
  return na.includes(nb) || nb.includes(na)
}

function contextByPrefix(feature: MapboxFeature): Record<string, string> {
  const out: Record<string, string> = {}
  for (const c of feature.context ?? []) {
    const prefix = c.id.split('.')[0] ?? ''
    if (prefix && c.text) out[prefix] = c.text
  }
  return out
}

const SKIP_PLACE_NAME_PARTS = /^(việt nam|vietnam|\d{4,6})$/i

/** Names from Mapbox feature useful for matching open-api.vn. */
export function extractMapboxAdminCandidates(
  feature: MapboxFeature,
  parsed: MapboxParsedAddress
): string[] {
  const ctx = contextByPrefix(feature)
  const fromContext = Object.values(ctx).filter(Boolean)
  const fromPlaceName = feature.place_name
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p && !SKIP_PLACE_NAME_PARTS.test(p))

  const all = [parsed.province, parsed.district, parsed.ward, feature.text, ...fromContext, ...fromPlaceName]
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of all) {
    const t = s.trim()
    if (!t || seen.has(t.toLowerCase())) continue
    seen.add(t.toLowerCase())
    out.push(t)
  }
  return out
}

/** Reverse geocode coordinates for richer district/ward context. */
export async function reverseGeocodeMapbox(lng: number, lat: number): Promise<MapboxParsedAddress | null> {
  if (!MAPBOX_TOKEN || !lng || !lat) return null

  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
    `?access_token=${MAPBOX_TOKEN}` +
    `&country=vn` +
    `&language=vi` +
    `&types=address,locality,neighborhood,district,place,region`

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = (await res.json()) as MapboxGeocodeResponse
    const feature = data.features?.[0]
    if (!feature) return null
    return parseMapboxFeature(feature)
  } catch {
    return null
  }
}

/** Merge forward feature parse + reverse geocode. */
export async function enrichParsedFromMapbox(feature: MapboxFeature): Promise<MapboxParsedAddress> {
  const forward = parseMapboxFeature(feature)
  const [lng, lat] = feature.center ?? [forward.lng, forward.lat]
  const reverse = await reverseGeocodeMapbox(lng, lat)
  if (!reverse) return forward

  return {
    ...forward,
    province: reverse.province || forward.province,
    district: reverse.district || forward.district,
    ward: reverse.ward || forward.ward,
    lat: forward.lat || reverse.lat,
    lng: forward.lng || reverse.lng,
  }
}

export function parseMapboxFeature(feature: MapboxFeature): MapboxParsedAddress {
  const ctx = contextByPrefix(feature)
  const [lng, lat] = feature.center ?? [0, 0]
  const types = feature.place_type ?? []

  let province = ctx.region || ''
  let district = ctx.district || ctx.county || ''
  // `place` in HCMC context is often ward-level (e.g. An Phú Đông)
  const placeMaybeWard =
    ctx.place && ctx.place !== district && ctx.place !== province ? ctx.place : ''
  let ward = ctx.neighborhood || ctx.locality || placeMaybeWard || ''

  if (types.includes('district')) {
    district = feature.text || district
  }
  if (types.includes('region')) {
    province = feature.text || province
  }
  if (types.includes('locality') || types.includes('neighborhood')) {
    ward = feature.text || ward
  }
  if (!province) province = ctx.place || ''

  let address_line = ''
  if (feature.address && feature.text) {
    address_line = `${feature.address} ${feature.text}`.trim()
  } else if (feature.address) {
    address_line = feature.address
  } else if (feature.text) {
    address_line = feature.text
  } else {
    const parts = feature.place_name.split(',').map((p) => p.trim())
    address_line = parts[0] ?? feature.place_name
  }

  return {
    address_line,
    ward,
    district,
    province,
    lat,
    lng,
    place_name: feature.place_name,
  }
}

/** Mapbox Geocoding v5 allows at most 10 results per request. */
export const MAPBOX_ADDRESS_SUGGEST_LIMIT = 10

export async function searchMapboxAddresses(
  query: string,
  options?: { limit?: number; signal?: AbortSignal }
): Promise<MapboxFeature[]> {
  const q = query.trim()
  if (!MAPBOX_TOKEN || q.length < 3) return []

  const limit = Math.min(Math.max(options?.limit ?? MAPBOX_ADDRESS_SUGGEST_LIMIT, 1), MAPBOX_ADDRESS_SUGGEST_LIMIT)
  const encoded = encodeURIComponent(q)
  // Ho Chi Minh City — bias local results (e.g. "quận 12", "iuh")
  const proximity = '106.6297,10.8231'
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json` +
    `?access_token=${MAPBOX_TOKEN}` +
    `&country=vn` +
    `&language=vi` +
    `&autocomplete=true` +
    `&types=address,poi,place,district,locality,neighborhood` +
    `&proximity=${proximity}` +
    `&limit=${limit}`

  const res = await fetch(url, { signal: options?.signal })
  if (!res.ok) {
    console.warn('[mapbox-address] geocode failed', res.status, q)
    return []
  }

  const data = (await res.json()) as MapboxGeocodeResponse
  return data.features ?? []
}

export function isMapboxAddressEnabled(): boolean {
  return Boolean(MAPBOX_TOKEN)
}
