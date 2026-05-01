'use client'

import { useEffect, useMemo, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Shipper, OrderTracking } from '@/lib/tracking-types'
import { fetchJsonSafe } from '@/lib/api'

/**
 * PURE DEMO MAP – HTML EQUIVALENT
 * --------------------------------
 * ✔ new mapboxgl.Map
 * ✔ Directions API (driving-traffic)
 * ✔ map.addSource / map.addLayer (route line + shipper circle)
 * ✔ Circle layer thay Marker DOM → khớp mọi zoom (cùng canvas/ projection)
 * ✔ setInterval cập nhật GeoJSON source cho animation
 *
 * ❌ No react-map-gl, No modal, No DOM Marker (gây lệch zoom)
 */

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? ''
const DEFAULT_CENTER: [number, number] = [106.660172, 10.762622]
const POLL_INTERVAL_MS = 5000 // request GPS mới theo chu kỳ (5s)

const VIETNAM_BOUNDS = {
  minLat: 8,
  maxLat: 24,
  minLng: 102,
  maxLng: 110,
}

function isInVietnam(lat: number | null | undefined, lng: number | null | undefined): boolean {
  if (lat == null || lng == null) return false
  return (
    lat >= VIETNAM_BOUNDS.minLat &&
    lat <= VIETNAM_BOUNDS.maxLat &&
    lng >= VIETNAM_BOUNDS.minLng &&
    lng <= VIETNAM_BOUNDS.maxLng
  )
}

interface Props {
  shipper: Shipper | null
  orders: OrderTracking[]
  className?: string
  /** Nếu truyền: poll vị trí qua đây (token khách) và chỉ `setData` marker — không dùng API admin `/tracking/shippers/.../location`. */
  pollLocation?: () => Promise<{ lat: number; lng: number } | null>
  /** Sau mỗi lần lấy tọa độ mới (pollLocation hoặc admin), có thể cập nhật UI cha (vd. km) mà không cần remount map. */
  onLiveLngLat?: (lat: number, lng: number) => void
}

export default function MapboxShipperDetailMapDemo({
  shipper,
  orders,
  className = '',
  pollLocation,
  onLiveLngLat,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollLocationRef = useRef(pollLocation)
  pollLocationRef.current = pollLocation
  const onLiveLngLatRef = useRef(onLiveLngLat)
  onLiveLngLatRef.current = onLiveLngLat

  /** Chỉ các trường cấu trúc tuyến/gán shipper — đổi tọa độ shipper không remount map. */
  const routeStructureKey = useMemo(() => {
    if (!shipper?.user_id) return ''
    return orders
      .filter(
        (o) =>
          o.shipper_id === shipper.user_id &&
          o.destination_lat != null &&
          o.destination_lng != null,
      )
      .map((o) => `${o.order_id}:${o.destination_lat}:${o.destination_lng}`)
      .sort()
      .join(';')
  }, [shipper?.user_id, orders])

  useEffect(() => {
    if (!shipper || !containerRef.current || !MAPBOX_TOKEN || !routeStructureKey) return

    const activeOrder = orders
      .filter(
        o =>
          o.shipper_id === shipper.user_id &&
          o.destination_lat &&
          o.destination_lng
      )
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0]

    if (!activeOrder) return

    const adminPollShipperId = shipper.user_id

    const end: [number, number] = [
      activeOrder.destination_lng!,
      activeOrder.destination_lat!
    ]

    const orderCurrentInVn = isInVietnam(activeOrder.current_lat, activeOrder.current_lng)
    const shipperCurrentInVn = isInVietnam(shipper.current_lat, shipper.current_lng)
    const start: [number, number] = orderCurrentInVn
      ? [activeOrder.current_lng!, activeOrder.current_lat!]
      : shipperCurrentInVn
        ? [shipper.current_lng!, shipper.current_lat!]
        : end

    mapboxgl.accessToken = MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: start,
      zoom: 14
    })

    mapRef.current = map
    const container = containerRef.current

    map.on('load', async () => {
      map.resize()
      try {
        const url =
          `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/` +
          `${start[0]},${start[1]};${end[0]},${end[1]}` +
          `?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`

        const res = await fetch(url)
        const data = await res.json()
        const route = data.routes?.[0]?.geometry ?? {
          type: 'LineString',
          coordinates: [start, end]
        }

        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: route,
            properties: {}
          }
        })

        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': '#1abc9c',
            'line-width': 5
          }
        })

        const coordinates = (route.coordinates as [number, number][]).length >= 2
          ? (route.coordinates as [number, number][])
          : [start, end]
        const lastCoord = coordinates[coordinates.length - 1]

        // === ICON: Xe (custom - vòng tròn xanh + emoji xe máy) ===
        const vehicleSize = 64
        const vehicleCanvas = document.createElement('canvas')
        vehicleCanvas.width = vehicleSize
        vehicleCanvas.height = vehicleSize
        const vCtx = vehicleCanvas.getContext('2d')!
        vCtx.fillStyle = '#10b981'
        vCtx.beginPath()
        vCtx.arc(vehicleSize / 2, vehicleSize / 2, vehicleSize / 2 - 2, 0, Math.PI * 2)
        vCtx.fill()
        vCtx.strokeStyle = '#fff'
        vCtx.lineWidth = 3
        vCtx.stroke()
        vCtx.font = '36px Arial'
        vCtx.textAlign = 'center'
        vCtx.textBaseline = 'middle'
        vCtx.fillText('🏍️', vehicleSize / 2, vehicleSize / 2)
        map.addImage('vehicle-icon', vCtx.getImageData(0, 0, vehicleSize, vehicleSize))

        // === ICON: Đích đến (custom - pin đỏ như trong ảnh) ===
        const pinW = 32
        const pinH = 44
        const pinCanvas = document.createElement('canvas')
        pinCanvas.width = pinW
        pinCanvas.height = pinH
        const pCtx = pinCanvas.getContext('2d')!
        pCtx.fillStyle = '#3b82f6'
        pCtx.beginPath()
        pCtx.arc(pinW / 2, pinW / 2 + 2, pinW / 2 - 2, 0, Math.PI * 2)
        pCtx.fill()
        pCtx.beginPath()
        pCtx.moveTo(pinW / 2 - 4, pinW / 2 + 4)
        pCtx.lineTo(pinW / 2, pinH - 2)
        pCtx.lineTo(pinW / 2 + 4, pinW / 2 + 4)
        pCtx.closePath()
        pCtx.fill()
        pCtx.fillStyle = '#fff'
        pCtx.beginPath()
        pCtx.arc(pinW / 2, pinW / 2, 3, 0, Math.PI * 2)
        pCtx.fill()
        map.addImage('destination-icon', pCtx.getImageData(0, 0, pinW, pinH))

        // === Đích đến (pin cố định cuối route) ===
        map.addSource('destination', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'Point', coordinates: lastCoord }
          }
        })
        map.addLayer({
          id: 'destination-marker',
          type: 'symbol',
          source: 'destination',
          layout: {
            'icon-image': 'destination-icon',
            'icon-size': 1.2,
            'icon-allow-overlap': true,
            'icon-anchor': 'bottom'
          }
        })

        // === Xe shipper (di chuyển theo route) ===
        map.addSource('shipper-position', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'Point', coordinates: coordinates[0] }
          }
        })
        map.addLayer({
          id: 'shipper-vehicle',
          type: 'symbol',
          source: 'shipper-position',
          layout: {
            'icon-image': 'vehicle-icon',
            'icon-size': 0.6,
            'icon-allow-overlap': true
          }
        })

        setTimeout(() => map.resize(), 100)

        const source = map.getSource('shipper-position') as mapboxgl.GeoJSONSource | undefined

        const updateMarkerFromLatLng = (lat: number | string | null | undefined, lng: number | string | null | undefined) => {
          if (!source) return
          const latNum = typeof lat === 'number' ? lat : Number(lat)
          const lngNum = typeof lng === 'number' ? lng : Number(lng)
          if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return

          source.setData({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Point',
              coordinates: [lngNum, latNum],
            },
          })
          onLiveLngLatRef.current?.(latNum, lngNum)
        }

        const pollLatestLocation = async () => {
          if (pollLocationRef.current) {
            try {
              const loc = await pollLocationRef.current()
              if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
                updateMarkerFromLatLng(loc.lat, loc.lng)
              }
            } catch (e) {
              console.warn('pollLocation:', e)
            }
            return
          }

          const res = await fetchJsonSafe(`api/backend/v1/tracking/shippers/${adminPollShipperId}/location`)
          if (!res.ok || !res.data?.success) return

          const loc = res.data?.data
          const lat = loc?.lat ?? null
          const lng = loc?.lng ?? null
          updateMarkerFromLatLng(lat, lng)
        }

        const startPolling = () => {
          if (intervalRef.current) return
          intervalRef.current = setInterval(() => {
            void pollLatestLocation()
          }, POLL_INTERVAL_MS)
        }

        const stopPolling = () => {
          if (!intervalRef.current) return
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }

        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            void pollLatestLocation()
            startPolling()
            return
          }
          stopPolling()
        }

        // Only poll while this detail page is visible.
        document.addEventListener('visibilitychange', handleVisibilityChange)

        // Update ngay lần đầu để icon không đứng yên đến hết chu kỳ.
        void pollLatestLocation()
        if (document.visibilityState === 'visible') {
          startPolling()
        }

        // Ensure cleanup also removes listeners started after map load.
        map.once('remove', () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange)
          stopPolling()
        })
      } catch (err) {
        console.error('Mapbox demo error:', err)
      }
    })

    const ro = new ResizeObserver(() => {
      map.resize()
    })
    if (container) ro.observe(container)

    return () => {
      ro.disconnect()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [shipper?.user_id, routeStructureKey])

  if (!shipper || !MAPBOX_TOKEN) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-100 rounded-lg">
        Select a shipper
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`w-full h-96 rounded-xl overflow-hidden border shadow ${className}`}
      style={{ minHeight: 400 }}
    />
  )
}
