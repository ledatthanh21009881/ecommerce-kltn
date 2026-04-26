export interface AdminUser {
  account_id: number
  account_name: string
  account_type: string
  role: string
  preferred_locale?: 'vi' | 'en'
}

export function getAuthData(): { token: string | null; user: AdminUser | null } {
  try {
    const token = localStorage.getItem('adminToken')
    const userData = localStorage.getItem('adminUser')
    
    if (!token || !userData || userData === 'null' || userData === 'undefined') {
      return { token: null, user: null }
    }
    
    const user = JSON.parse(userData)
    return { token, user }
  } catch (error) {
    console.error('Error parsing auth data:', error)
    // Clear invalid data
    localStorage.removeItem('adminUser')
    localStorage.removeItem('adminToken')
    return { token: null, user: null }
  }
}

export function setAuthData(token: string, user: AdminUser): void {
  localStorage.setItem('adminToken', token)
  localStorage.setItem('adminUser', JSON.stringify(user))
  if (user.preferred_locale === 'vi' || user.preferred_locale === 'en') {
    localStorage.setItem('adminLanguage', user.preferred_locale)
  }

  // Keep shared token store in sync so refresh flow works reliably.
  try {
    const parts = token.split('.')
    let expiresAt = Date.now() + 60 * 60 * 1000
    if (parts.length === 3) {
      const payload = JSON.parse(
        atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
      ) as { exp?: number }
      if (payload.exp) {
        expiresAt = payload.exp * 1000
      }
    }

    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      localStorage.setItem('access_token', token)
      localStorage.setItem('token_expires_at', expiresAt.toString())
    }
  } catch {
    // Ignore sync errors; adminToken/adminUser are still persisted.
  }
}

export function updateAdminUserPreferredLocale(locale: 'vi' | 'en'): void {
  const { token, user } = getAuthData()
  if (!token || !user) return
  setAuthData(token, { ...user, preferred_locale: locale })
}

export function clearAuthData(): void {
  localStorage.removeItem('adminToken')
  localStorage.removeItem('adminUser')
}

export function isAuthenticated(): boolean {
  const { token, user } = getAuthData()
  return !!(token && user)
}

// Check if adminToken is expired by parsing JWT
function isAdminTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return true
    }

    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
    ) as { exp?: number }

    const bufferTime = 5 * 60 * 1000 // 5 minutes buffer

    if (payload.exp) {
      const expirationTime = payload.exp * 1000
      return Date.now() + bufferTime >= expirationTime
    }

    // If no exp in token, consider it expired if older than 1 hour
    return true
  } catch (error) {
    console.error('[admin-auth] Error parsing adminToken:', error)
    return true
  }
}

// Check and refresh auth if needed (returns true if valid, false if should redirect to login)
export async function checkAndRefreshAuth(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  const { token, user } = getAuthData()
  
  // No token or user data
  if (!token || !user) {
    return false
  }

  // Check if token is expired
  if (isAdminTokenExpired(token)) {
    console.log('[admin-auth] AdminToken expired, attempting refresh...')
    
    try {
      // Import tokenStore dynamically
      const { tokenStore } = await import('./tokenStore')
      
      // Check if we have refresh token
      const refreshToken = tokenStore.getRefreshToken()
      if (!refreshToken) {
        console.log('[admin-auth] No refresh token available')
        clearAuthData()
        tokenStore.clearTokens()
        return false
      }

      // Try to refresh token
      const newTokenData = await tokenStore.refreshToken()
      
      // Update adminToken with new token
      localStorage.setItem('adminToken', newTokenData.token)
      console.log('[admin-auth] AdminToken refreshed successfully')
      
      return true
    } catch (refreshError: any) {
      // Silently handle refresh token errors - don't show error to user
      // This is expected behavior when refresh token expires
      const errorMessage = refreshError?.message || 'Unknown error'
      console.log('[admin-auth] Token refresh failed (expected if refresh token expired):', errorMessage)
      
      // Clear auth data if refresh fails
      clearAuthData()
      try {
        const { tokenStore } = await import('./tokenStore')
        tokenStore.clearTokens()
      } catch (e) {
        // Ignore errors when clearing tokens
      }
      
      // Return false to redirect to login (don't throw error to avoid UI error display)
      return false
    }
  }

  // Token is still valid
  return true
}