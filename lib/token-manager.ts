// Token Manager Service
// Quản lý access token và refresh token, tự động refresh khi token hết hạn

interface TokenData {
  token: string
  refresh_token: string
  expires_at: number
}

class TokenManager {
  private static instance: TokenManager
  private refreshPromise: Promise<TokenData> | null = null

  private constructor() {}

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager()
    }
    return TokenManager.instance
  }

  // Lưu token vào localStorage
  saveTokens(tokenData: TokenData): void {
    localStorage.setItem('access_token', tokenData.token)
    localStorage.setItem('refresh_token', tokenData.refresh_token)
    localStorage.setItem('token_expires_at', tokenData.expires_at.toString())
  }

  // Lấy access token
  getAccessToken(): string | null {
    return localStorage.getItem('access_token')
  }

  // Lấy refresh token
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token')
  }

  // Kiểm tra token có hết hạn không
  isTokenExpired(): boolean {
    const token = this.getAccessToken()
    if (!token) return true

    try {
      // Parse JWT token to get exp claim
      const parts = token.split('.')
      if (parts.length !== 3) {
        return true
      }

      // Decode payload (second part)
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
      
      // Check if exp claim exists
      if (!payload.exp) {
        // Fallback to expires_at from localStorage if exp not in token
        const expiresAt = localStorage.getItem('token_expires_at')
        if (!expiresAt) return true
        
        const bufferTime = 5 * 60 * 1000 // 5 phút
        return Date.now() + bufferTime >= parseInt(expiresAt)
      }

      // Check expiration with 5 minute buffer
      const bufferTime = 5 * 60 * 1000 // 5 phút
      const expirationTime = payload.exp * 1000 // Convert to milliseconds
      return Date.now() + bufferTime >= expirationTime
    } catch (error) {
      console.error('Error parsing token:', error)
      // Fallback to expires_at from localStorage
      const expiresAt = localStorage.getItem('token_expires_at')
      if (!expiresAt) return true
      
      const bufferTime = 5 * 60 * 1000 // 5 phút
      return Date.now() + bufferTime >= parseInt(expiresAt)
    }
  }

  // Xóa tất cả token
  clearTokens(): void {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('token_expires_at')
  }

  // Refresh token
  async refreshToken(): Promise<TokenData> {
    // Nếu đang refresh, trả về promise hiện tại
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
      const response = await fetch('/api/v1/auth/refresh-advanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: refreshToken
        })
      })

      if (!response.ok) {
        throw new Error('Failed to refresh token')
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.message || 'Refresh token failed')
      }

      // Parse token to get expiration time if available
      let expiresAt = Date.now() + (60 * 60 * 1000) // Default: 1 giờ
      const newToken = data.data.access_token || data.data.token
      
      if (newToken) {
        try {
          // Parse JWT to get exp claim
          const parts = newToken.split('.')
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
            if (payload.exp) {
              expiresAt = payload.exp * 1000 // Convert to milliseconds
            }
          }
        } catch (error) {
          console.error('Error parsing token expiration:', error)
          // Use default expiration
        }
      }

      const tokenData: TokenData = {
        token: newToken, // Support both field names
        refresh_token: data.data.refresh_token,
        expires_at: expiresAt
      }

      // Lưu token mới
      this.saveTokens(tokenData)
      
      return tokenData
    } catch (error) {
      // Nếu refresh thất bại, xóa token và throw error
      this.clearTokens()
      throw error
    }
  }

  // Lấy token hiện tại hoặc refresh nếu cần
  async getValidToken(): Promise<string> {
    const currentToken = this.getAccessToken()
    
    if (!currentToken || this.isTokenExpired()) {
      const newTokenData = await this.refreshToken()
      return newTokenData.token
    }
    
    return currentToken
  }
}

export const tokenManager = TokenManager.getInstance()
