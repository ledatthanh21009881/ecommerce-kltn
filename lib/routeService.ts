/**
 * Route Service - Mapbox Directions API (driving-traffic)
 * Requires NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
 */

export interface RoutePoint {
  lat: number
  lng: number
}

/** Mapbox Directions API response shape */
export interface MapboxRouteResponse {
  routes?: Array<{
    geometry: {
      coordinates: [number, number][] // [lng, lat]
      type: string
    }
    distance: number
    duration: number
  }>
  code?: string
  message?: string
}

/**
 * Get route from origin to destination using Mapbox Directions (driving-traffic).
 * @param origin - Starting point
 * @param destination - End point
 * @returns Array of { lat, lng } for polyline, or null if error
 */
export async function getRoute(
  origin: RoutePoint,
  destination: RoutePoint
): Promise<RoutePoint[] | null> {
  const token = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '')
    : (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '')
  if (!token) {
    console.warn('Mapbox token missing: NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN')
    return null
  }
  try {
    // Mapbox: driving-traffic for traffic-aware route
    const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coords}?geometries=geojson&overview=full&access_token=${token}`
    const response = await fetch(url)
    if (!response.ok) {
      console.error('Mapbox Directions error:', response.status, response.statusText)
      return null
    }
    const data: MapboxRouteResponse = await response.json()
    if (!data.routes?.length) {
      console.error('Mapbox route not found:', data.message ?? data)
      return null
    }
    const coordinates = data.routes[0].geometry.coordinates
    return coordinates.map(([lng, lat]) => ({ lat, lng }))
  } catch (error) {
    console.error('Error fetching route:', error)
    return null
  }
}

/**
 * Get route geometry as [lng, lat][] for Mapbox GL (e.g. line layer, animation).
 * Same API call as getRoute but returns raw coordinates.
 */
export async function getRouteCoordinates(
  origin: RoutePoint,
  destination: RoutePoint
): Promise<[number, number][] | null> {
  const token = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '')
    : (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '')
  if (!token) return null
  try {
    const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coords}?geometries=geojson&overview=full&access_token=${token}`
    const response = await fetch(url)
    if (!response.ok) return null
    const data: MapboxRouteResponse = await response.json()
    if (!data.routes?.length) return null
    return data.routes[0].geometry.coordinates
  } catch {
    return null
  }
}

/**
 * Calculate distance between two points (Haversine formula)
 */
export function calculateDistance(point1: RoutePoint, point2: RoutePoint): number {
  const R = 6371
  const dLat = (point2.lat - point1.lat) * Math.PI / 180
  const dLng = (point2.lng - point1.lng) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
