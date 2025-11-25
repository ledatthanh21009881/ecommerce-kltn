export const getBackendBaseUrl = () => {
  return process.env.BACKEND_URL || "http://localhost:8000"
}

export const backendUrl = (path: string) => {
  const base = getBackendBaseUrl()
  const cleanPath = path.startsWith("/") ? path : `/${path}`
  return `${base}${cleanPath}`
}


