// API Client for making HTTP requests to backend
import { tokenStore } from './tokenStore'

const API_BASE_URL = '/api/backend/v1'

interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  errors?: Record<string, string>
}

// Extend RequestInit to track retry attempts
interface RequestOptions extends RequestInit {
  _retry?: boolean
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`
    
    // Skip refresh for auth endpoints to avoid infinite loop
    const isAuthEndpoint = 
      endpoint.includes('/auth/refresh-advanced') ||
      endpoint.includes('/auth/admin/login') ||
      endpoint.includes('/auth/login')
    
    // Get access token - prefer adminToken (for admin UI), fallback to shared tokenStore
    let token: string | null = null
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('adminToken')
    }
    if (!token) {
      try {
        token = await tokenStore.getValidToken()
      } catch (error) {
        // If getValidToken fails (no refresh token), try to get current token
        token = tokenStore.getAccessToken()
        if (!token) {
          throw new Error('No authentication token found. Please login again.')
        }
      }
    }
    
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      const data = await response.json()

      // Phát hiện 401 cả ở HTTP status lẫn body (backend legacy có thể trả 200 + status_code:401).
      const bodyStatusCode = data && typeof data === 'object' ? (data as any).status_code : undefined
      const bodyMsg = data && typeof data === 'object' ? String((data as any).message || '').toLowerCase() : ''
      const isExpired =
        response.status === 401 ||
        bodyStatusCode === 401 ||
        bodyMsg.includes('invalid or expired token') ||
        bodyMsg.includes('token expired')

      if (isExpired && !options._retry && !isAuthEndpoint) {
        options._retry = true
        try {
          console.log('[ApiClient] Token expired, attempting refresh...')
          const newTokenData = await tokenStore.refreshToken()
          if (typeof window !== 'undefined') {
            const adminToken = localStorage.getItem('adminToken')
            if (adminToken) {
              localStorage.setItem('adminToken', newTokenData.token)
            }
          }
          return this.request<T>(endpoint, options)
        } catch (refreshError) {
          console.error('[ApiClient] Token refresh failed:', refreshError)
          tokenStore.clearTokens()
          if (typeof window !== 'undefined') {
            localStorage.removeItem('adminToken')
            localStorage.removeItem('adminUser')
            localStorage.removeItem('admin_avatar_url')
            // Redirect về login phù hợp với context (admin vs customer).
            const path = window.location.pathname
            const isAdminCtx = path.startsWith('/admin')
            const loginUrl = isAdminCtx ? '/admin-login' : '/login'
            if (path !== loginUrl) {
              window.location.href = `${loginUrl}?reason=expired`
            }
          }
          throw new Error('Authentication failed: Please login again.')
        }
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`)
      }

      return data
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // GET request
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
    })
  }

  // POST request
  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  // PUT request
  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  // DELETE request
  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    })
  }

  // PATCH request
  async patch<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }
}

export const apiClient = new ApiClient()
