export const getBackendBaseUrl = () => {
  // Prefer explicit server-only BACKEND_URL, fallback to NEXT_PUBLIC_BACKEND_URL for shared config.
  return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
}

export const getWebSocketUrl = () => {
  return process.env.WEBSOCKET_URL || process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:8080"
}

export const backendUrl = (path: string) => {
  const base = getBackendBaseUrl()
  const cleanPath = path.startsWith("/") ? path : `/${path}`
  return `${base}${cleanPath}`
}


