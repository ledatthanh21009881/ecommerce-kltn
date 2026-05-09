export const getBackendBaseUrl = () => {
  // Prefer explicit server-only BACKEND_URL, fallback to NEXT_PUBLIC_BACKEND_URL for shared config.
  return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://103.90.225.212:8000"
}

export const getWebSocketUrl = () => {
  const explicit =
    process.env.WEBSOCKET_URL || process.env.NEXT_PUBLIC_WEBSOCKET_URL
  if (explicit) return explicit

  // On client, derive from current origin to avoid broken localhost fallback in production.
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws"
    const host = window.location.hostname
    const port = process.env.NEXT_PUBLIC_WEBSOCKET_PORT || "8080"
    return `${protocol}://${host}:${port}`
  }

  // Server-side fallback for local dev.
  return "ws://localhost:8080"
}

export const backendUrl = (path: string) => {
  const base = getBackendBaseUrl()
  const cleanPath = path.startsWith("/") ? path : `/${path}`
  return `${base}${cleanPath}`
}


