export const getBackendBaseUrl = () => {
  return process.env.BACKEND_URL || "http://localhost:8000"
}

export const getWebSocketUrl = () => {
  return process.env.WEBSOCKET_URL || "ws://localhost:8080"
}

export const backendUrl = (path: string) => {
  const base = getBackendBaseUrl()
  const cleanPath = path.startsWith("/") ? path : `/${path}`
  return `${base}${cleanPath}`
}


