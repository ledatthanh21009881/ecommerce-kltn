export interface AllowedMenu {
  key: string
  path: string
  name: string
}

export interface AdminUser {
  account_id: number
  account_name: string
  account_type: string
  role: string
  roles?: string[]
  allowed_menus?: AllowedMenu[]
  order_actions?: string[]
  preferred_locale?: 'vi' | 'en'
}

export function hasOrderAction(action: string, user?: AdminUser | null): boolean {
  const u = user ?? getAuthData().user
  if (!u) return false
  if (u.roles?.includes('admin')) return true
  return (u.order_actions ?? []).includes(action)
}

export function getAuthData(): { token: string | null; user: AdminUser | null } {
  try {
    const token = localStorage.getItem('adminToken')
    const userData = localStorage.getItem('adminUser')

    if (!token || !userData || userData === 'null' || userData === 'undefined') {
      return { token: null, user: null }
    }

    const user = JSON.parse(userData) as AdminUser
    return { token, user }
  } catch (error) {
    console.error('Error parsing auth data:', error)
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
    // Ignore sync errors
  }
}

export function updateAdminUserFromSession(partial: Partial<AdminUser>): void {
  const { token, user } = getAuthData()
  if (!token || !user) return
  setAuthData(token, { ...user, ...partial })
}

export function updateAdminUserPreferredLocale(locale: 'vi' | 'en'): void {
  updateAdminUserFromSession({ preferred_locale: locale })
}

export function clearAuthData(): void {
  localStorage.removeItem('adminToken')
  localStorage.removeItem('adminUser')
}

export function isAuthenticated(): boolean {
  const { token, user } = getAuthData()
  return !!(token && user)
}

export function getAllowedMenuPaths(user: AdminUser | null): Set<string> {
  if (!user?.allowed_menus?.length) {
    if (user?.roles?.includes('admin')) {
      return new Set(getFullAdminMenuPaths())
    }
    return new Set()
  }
  return new Set(user.allowed_menus.map((m) => m.path))
}

export function getFullAdminMenuPaths(): string[] {
  return [
    '/admin/dashboard',
    '/admin/categories',
    '/admin/products',
    '/admin/orders',
    '/admin/users',
    '/admin/roles',
    '/admin/accounts',
    '/admin/inventory',
    '/admin/shipping',
    '/admin/promotions',
    '/admin/suppliers',
    '/admin/purchase-receipts',
    '/admin/content',
    '/admin/payments',
    '/admin/tracking',
    '/admin/settings',
  ]
}

const PATH_EXCEPTIONS = [
  '/admin/messenger',
  '/admin-login',
  '/admin/forgot-password',
  '/admin/reset-password',
]

export function isAdminPanelPathAllowed(pathname: string, user: AdminUser | null): boolean {
  if (!pathname?.startsWith('/admin')) {
    return true
  }
  if (PATH_EXCEPTIONS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return true
  }
  if (pathname.match(/^\/admin\/tracking\/shipper\/[^/]+$/)) {
    return true
  }

  const allowed = getAllowedMenuPaths(user)
  if (allowed.size === 0 && user?.roles?.includes('admin')) {
    return true
  }

  if (pathname === '/admin' || pathname === '/admin/') {
    return allowed.has('/admin/dashboard') || allowed.size > 0
  }

  for (const path of allowed) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      return true
    }
  }

  return false
}

export function getFirstAllowedPath(user: AdminUser | null): string | null {
  const menus = user?.allowed_menus
  if (menus?.length) {
    const dashboard = menus.find((m) => m.path === '/admin/dashboard')
    return dashboard?.path ?? menus[0].path
  }
  if (user?.roles?.includes('admin')) {
    return '/admin/dashboard'
  }
  return null
}

function isAdminTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return true
    }

    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
    ) as { exp?: number }

    const bufferTime = 5 * 60 * 1000

    if (payload.exp) {
      const expirationTime = payload.exp * 1000
      return Date.now() + bufferTime >= expirationTime
    }

    return true
  } catch (error) {
    console.error('[admin-auth] Error parsing adminToken:', error)
    return true
  }
}

export async function syncAdminMenusFromApi(): Promise<AdminUser | null> {
  const { token, user } = getAuthData()
  if (!token || !user) return null

  try {
    const response = await fetch('/api/backend/v1/auth/admin/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const result = await response.json()
    if (!response.ok || !result?.success) {
      return user
    }

    const data = result.data
    const updated: AdminUser = {
      ...user,
      ...data.account,
      roles: data.roles ?? user.roles,
      allowed_menus: data.allowed_menus ?? user.allowed_menus,
      order_actions: data.order_actions ?? user.order_actions,
    }
    setAuthData(token, updated)
    return updated
  } catch (e) {
    console.error('[admin-auth] syncAdminMenusFromApi failed', e)
    return user
  }
}

export async function checkAndRefreshAuth(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  const { token, user } = getAuthData()

  if (!token || !user) {
    return false
  }

  if (isAdminTokenExpired(token)) {
    console.log('[admin-auth] AdminToken expired, attempting refresh...')

    try {
      const { tokenStore } = await import('./tokenStore')

      const refreshToken = tokenStore.getRefreshToken()
      if (!refreshToken) {
        console.log('[admin-auth] No refresh token available')
        clearAuthData()
        tokenStore.clearTokens()
        return false
      }

      const newTokenData = await tokenStore.refreshToken()

      localStorage.setItem('adminToken', newTokenData.token)
      console.log('[admin-auth] AdminToken refreshed successfully')

      return true
    } catch (refreshError: unknown) {
      const errorMessage = refreshError instanceof Error ? refreshError.message : 'Unknown error'
      console.log('[admin-auth] Token refresh failed:', errorMessage)

      clearAuthData()
      try {
        const { tokenStore } = await import('./tokenStore')
        tokenStore.clearTokens()
      } catch {
        // ignore
      }

      return false
    }
  }

  return true
}
