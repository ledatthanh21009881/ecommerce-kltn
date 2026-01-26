/**
 * Route Service - OSRM Routing API Integration
 * Free public routing service, no API key required
 */

export interface RoutePoint {
  lat: number
  lng: number
}

export interface RouteResponse {
  code: string
  routes: Array<{
    geometry: {
      coordinates: number[][] // [lng, lat] pairs
    }
    distance: number
    duration: number
  }>
}

/**
 * Get route from origin to destination using OSRM
 * @param origin - Starting point
 * @param destination - End point
 * @returns Array of [lat, lng] coordinates for polyline, or null if error
 */
export async function getRoute(
  origin: RoutePoint,
  destination: RoutePoint
): Promise<RoutePoint[] | null> {
  try {
    // OSRM API format: /route/v1/driving/{lng1},{lat1};{lng2},{lat2}
    // Returns coordinates in [lng, lat] format, we need to convert to [lat, lng]
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error('OSRM API error:', response.status, response.statusText)
      return null
    }
    
    const data: RouteResponse = await response.json()
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.error('OSRM route not found:', data)
      return null
    }
    
    // Convert [lng, lat] to [lat, lng] for Leaflet
    const coordinates = data.routes[0].geometry.coordinates
    return coordinates.map(([lng, lat]) => ({ lat, lng }))
  } catch (error) {
    console.error('Error fetching route:', error)
    return null
  }
}

/**
 * Calculate distance between two points (Haversine formula)
 * @param point1 - First point
 * @param point2 - Second point
 * @returns Distance in kilometers
 */
export function calculateDistance(point1: RoutePoint, point2: RoutePoint): number {
  const R = 6371 // Earth radius in km
  const dLat = (point2.lat - point1.lat) * Math.PI / 180
  const dLng = (point2.lng - point1.lng) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
