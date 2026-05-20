/** URL mặc định khi dev local / deploy VPS (ghi đè bằng env nếu cần). */
export const DEFAULT_BACKEND_LOCAL = 'http://localhost:8000'
export const DEFAULT_BACKEND_VPS = 'http://103.90.225.212:8000'

function trimBase(url: string): string {
  return url.trim().replace(/\/$/, '')
}

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

/**
 * URL gốc PHP backend.
 * - Local (localhost) → DEFAULT_BACKEND_LOCAL
 * - VPS / production → DEFAULT_BACKEND_VPS
 * Ghi đè: BACKEND_URL hoặc NEXT_PUBLIC_BACKEND_URL
 */
export const getBackendBaseUrl = () => {
  const explicit =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL

  if (explicit?.trim()) {
    return trimBase(explicit)
  }

  if (typeof window !== 'undefined') {
    if (isLocalHostname(window.location.hostname)) {
      const local = process.env.NEXT_PUBLIC_BACKEND_URL_LOCAL
      return trimBase(local || DEFAULT_BACKEND_LOCAL)
    }
    const vps = process.env.NEXT_PUBLIC_BACKEND_URL_VPS
    return trimBase(vps || DEFAULT_BACKEND_VPS)
  }

  if (process.env.NODE_ENV === 'development') {
    const local = process.env.BACKEND_URL_LOCAL || process.env.NEXT_PUBLIC_BACKEND_URL_LOCAL
    return trimBase(local || DEFAULT_BACKEND_LOCAL)
  }

  const vps = process.env.BACKEND_URL_VPS || process.env.NEXT_PUBLIC_BACKEND_URL_VPS
  return trimBase(vps || DEFAULT_BACKEND_VPS)
}

/** Base proxy admin: .../api/backend/v1 */
export const getBackendApiV1Base = (suffix = '/api/backend/v1') => {
  const base = getBackendBaseUrl()
  return `${base}${suffix.startsWith('/') ? suffix : `/${suffix}`}`
}

export const getWebSocketUrl = () => {
  const explicit =
    process.env.WEBSOCKET_URL || process.env.NEXT_PUBLIC_WEBSOCKET_URL
  if (explicit) return explicit

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const host = window.location.hostname
    if (isLocalHostname(host)) {
      return process.env.NEXT_PUBLIC_WEBSOCKET_URL_LOCAL || 'ws://localhost:8080'
    }
    const port = process.env.NEXT_PUBLIC_WEBSOCKET_PORT || '8080'
    return `${protocol}://${host}:${port}`
  }

  if (process.env.NODE_ENV === 'development') {
    return process.env.WEBSOCKET_URL_LOCAL || 'ws://localhost:8080'
  }
  return process.env.WEBSOCKET_URL_VPS || 'ws://localhost:8080'
}

export const backendUrl = (path: string) => {
  const base = getBackendBaseUrl()
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${cleanPath}`
}

export const backendApiV1Url = (path: string) => {
  const base = getBackendApiV1Base()
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${cleanPath}`
}
