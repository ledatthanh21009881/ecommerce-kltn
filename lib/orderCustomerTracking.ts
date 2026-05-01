/**
 * Theo dõi đơn phía khách — khoảng cách shipper ↔ đích, map phase (tham khảo ORDER_STATUS_CONFIG / admin tracking).
 */

const EARTH_RADIUS_KM = 6371

export function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

export function parseCoord(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

export function shipperDestinationDistanceKm(
  shipper: { current_lat?: number; current_lng?: number } | null | undefined,
  destinationLat?: number | null | undefined,
  destinationLng?: number | null | undefined,
): number | null {
  const slat = parseCoord(shipper?.current_lat)
  const slng = parseCoord(shipper?.current_lng)
  const dlat = parseCoord(destinationLat)
  const dlng = parseCoord(destinationLng)
  if (slat == null || slng == null || dlat == null || dlng == null) return null
  return haversineDistanceKm(slat, slng, dlat, dlng)
}

/** 5 bậc timeline (đặt hàng → xử lý → lấy hàng → giao → hoàn thành); không thay luồng backend. */
export type CustomerTimelineBadge = 'normal' | 'cancelled' | 'failed'

export type CustomerProgressIndex = 0 | 1 | 2 | 3 | 4

export function getCustomerOrderProgressPhase(statusRaw: string | undefined | null): {
  /** 0 đặt → 1 xử lý → 2 lấy hàng → 3 đang giao → 4 hoàn thành */
  activeIndex: CustomerProgressIndex
  badge: CustomerTimelineBadge
} {
  const s = (statusRaw ?? '').toString().trim().toLowerCase()
  if (!s) return { activeIndex: 0, badge: 'normal' }
  if (s === 'cancelled' || s === 'returned') return { activeIndex: 0, badge: 'cancelled' }
  if (s === 'failed') return { activeIndex: 3, badge: 'failed' }
  if (s === 'delivered' || s === 'completed') return { activeIndex: 4, badge: 'normal' }

  /** Đang giao tới khách — sau khi đã lấy hàng (picked_up/in_transit/… và shipping của API user). */
  if (['picked_up', 'in_transit', 'arriving', 'shipping'].includes(s)) {
    return { activeIndex: 3, badge: 'normal' }
  }

  /** Shipper đang đến lấy hàng — ORDER_STATUS_CONFIG.picking_up */
  if (s === 'picking_up') {
    return { activeIndex: 2, badge: 'normal' }
  }

  /** Chuẩn bị đơn / xác nhận / đóng gói / gán shipper (chưa lấy hàng) */
  if (
    [
      'processing',
      'confirmed',
      'assigned',
      'packaged',
      'packaging',
      'ready_to_ship',
      'paid',
      'confirmed_payment',
    ].includes(s)
  ) {
    return { activeIndex: 1, badge: 'normal' }
  }

  /** Đặt hàng chờ xử lý */
  if (['pending', 'payment_pending'].includes(s)) {
    return { activeIndex: 0, badge: 'normal' }
  }

  return { activeIndex: 1, badge: 'normal' }
}

export function trackingHasDestination(coords: {
  lat?: unknown
  lng?: unknown
}): boolean {
  return parseCoord(coords.lat) != null && parseCoord(coords.lng) != null
}
