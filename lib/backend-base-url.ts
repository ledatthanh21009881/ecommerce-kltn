export function getBackendBaseUrl(): string {
  // On server: BACKEND_URL is preferred. On client: only NEXT_PUBLIC_* is available.
  return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
}

