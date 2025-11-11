// API Client for making HTTP requests to backend
import { tokenManager } from './token-manager'

const API_BASE_URL = '/api/backend/v1'

interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  errors?: Record<string, string>
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`
    
    // Get access token - check for admin token first, then regular token
    // Use getValidToken() to ensure token is valid and refresh if needed
    let token = localStorage.getItem('adminToken')
    if (!token) {
      try {
        token = await tokenManager.getValidToken()
      } catch (error) {
        // If getValidToken fails (no refresh token), try to get current token
        token = tokenManager.getAccessToken()
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

      if (!response.ok) {
        // Handle token expiration
        if (response.status === 401) {
          try {
            await this.refreshToken()
            // Retry the request with new token
            return this.request(endpoint, options)
          } catch (refreshError) {
            // Redirect to login if refresh fails
            window.location.href = '/login'
            throw new Error('Authentication failed')
          }
        }
        
        throw new Error(data.message || `HTTP error! status: ${response.status}`)
      }

      return data
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  private async refreshToken(): Promise<void> {
    const refreshToken = tokenManager.getRefreshToken()
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh-advanced`, {
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
    
    if (data.success && data.data) {
      // Parse token to get expiration time if available
      let expiresAt = Date.now() + (60 * 60 * 1000) // Default: 1 hour
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

      tokenManager.saveTokens({
        token: newToken,
        refresh_token: data.data.refresh_token,
        expires_at: expiresAt
      })
    } else {
      throw new Error('Invalid refresh response')
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
