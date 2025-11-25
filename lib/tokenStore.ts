// Centralized token store for admin & client web
// Manages access token, refresh token and expiration time

export interface TokenData {
  token: string
  refresh_token: string
  expires_at: number
}

const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const EXPIRES_AT_KEY = 'token_expires_at'

// Use the same base URL as api-client
const API_BASE_URL = '/api/backend/v1'

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined'

class TokenStore {
  private refreshPromise: Promise<TokenData> | null = null

  saveTokens(tokenData: TokenData): void {
    if (!isBrowser()) return
    localStorage.setItem(ACCESS_TOKEN_KEY, tokenData.token)
    localStorage.setItem(REFRESH_TOKEN_KEY, tokenData.refresh_token)
    localStorage.setItem(EXPIRES_AT_KEY, tokenData.expires_at.toString())
  }

  getAccessToken(): string | null {
    if (!isBrowser()) return null
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  }

  getRefreshToken(): string | null {
    if (!isBrowser()) return null
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  }

  clearTokens(): void {
    if (!isBrowser()) return
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(EXPIRES_AT_KEY)
  }

  isTokenExpired(): boolean {
    if (!isBrowser()) return true
    const token = this.getAccessToken()
    if (!token) return true

    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        return true
      }

      const payload = JSON.parse(
        atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
      ) as { exp?: number }

      const bufferTime = 5 * 60 * 1000 // 5 minutes

      if (!payload.exp) {
        const expiresAtStr = localStorage.getItem(EXPIRES_AT_KEY)
        if (!expiresAtStr) return true
        return Date.now() + bufferTime >= parseInt(expiresAtStr, 10)
      }

      const expirationTime = payload.exp * 1000
      return Date.now() + bufferTime >= expirationTime
    } catch (error) {
      console.error('[TokenStore] Error parsing token:', error)
      const expiresAtStr = localStorage.getItem(EXPIRES_AT_KEY)
      if (!expiresAtStr) return true
      const bufferTime = 5 * 60 * 1000
      return Date.now() + bufferTime >= parseInt(expiresAtStr, 10)
    }
  }

  async refreshToken(): Promise<TokenData> {
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    this.refreshPromise = this.performRefresh(refreshToken)

    try {
      const result = await this.refreshPromise
      return result
    } finally {
      this.refreshPromise = null
    }
  }

  private async performRefresh(refreshToken: string): Promise<TokenData> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh-advanced`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to refresh token')
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Refresh token failed')
      }

      let expiresAt = Date.now() + 60 * 60 * 1000 // default 1h
      const newToken: string | undefined = data.data.access_token || data.data.token

      if (newToken) {
        try {
          const parts = newToken.split('.')
          if (parts.length === 3) {
            const payload = JSON.parse(
              atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
            ) as { exp?: number }
            if (payload.exp) {
              expiresAt = payload.exp * 1000
            }
          }
        } catch (err) {
          console.error('[TokenStore] Error parsing token expiration:', err)
        }
      }

      const tokenData: TokenData = {
        token: newToken || '',
        refresh_token: data.data.refresh_token,
        expires_at: expiresAt,
      }

      this.saveTokens(tokenData)
      return tokenData
    } catch (error) {
      this.clearTokens()
      throw error
    }
  }

  async getValidToken(): Promise<string> {
    const currentToken = this.getAccessToken()
    if (!currentToken || this.isTokenExpired()) {
      const newTokenData = await this.refreshToken()
      return newTokenData.token
    }
    return currentToken
  }
}

export const tokenStore = new TokenStore()


