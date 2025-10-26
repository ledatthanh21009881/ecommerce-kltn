import { tokenManager } from './token-manager'
import { apiClient } from './api-client'

// API base URL
const API_BASE_URL = '/api/v1'

// API Response types
export interface ApiResponse<T> {
  success: boolean
  message: string
  status_code: number
  data: T
}

export interface RegisterData {
  account_name: string
  email: string
  password: string
  first_name: string
  last_name: string
  phone: string
}

export interface LoginData {
  account_name: string
  password: string
}

export interface User {
  user_id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  gender: string
  birthdate: string | null
  avatar_url: string | null
  account_name: string
  last_login_at: string | null
  roles: string[]
}

export interface RegisterResponse {
  user_id: number
  account_id: number
  message: string
}

export interface LoginResponse {
  token: string
  refresh_token?: string
  user: User
  redirect?: string
}

export interface ForgotPasswordData {
  email: string
}

export interface ForgotPasswordResponse {
  message: string
}

export interface ChangePasswordData {
  current_password: string
  new_password: string
  confirm_password: string
}

export interface ChangePasswordResponse {
  message: string
}

export interface RefreshTokenData {
  refresh_token: string
}

export interface RefreshTokenResponse {
  access_token: string
  refresh_token: string
}

export interface AdminLoginData {
  account_name: string
  password: string
}

export interface AdminLoginResponse {
  token: string
  account: {
    account_id: number
    account_name: string
    account_type: string
    role: string
  }
}

// Auth utilities
export const authUtils = {
  // Save user token to localStorage
  saveToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
    }
  },

  // Get user token from localStorage
  // FIXED: Ưu tiên adminToken trước để admin pages hoạt động đúng
  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      // Ưu tiên adminToken trước (cho admin pages)
      const adminToken = localStorage.getItem('adminToken')
      if (adminToken) return adminToken
      
      // Fallback to auth_token (cho user pages)
      return localStorage.getItem('auth_token')
    }
    return null
  },

  // Save admin token to localStorage
  saveAdminToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminToken', token)
    }
  },

  // Get admin token from localStorage
  getAdminToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('adminToken')
    }
    return null
  },

  // Remove user token
  removeToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  },

  // Remove admin token
  removeAdminToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('adminToken')
    }
  },

  // Save refresh token to localStorage
  saveRefreshToken: (refreshToken: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('refresh_token', refreshToken)
    }
  },

  // Get refresh token from localStorage
  getRefreshToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refresh_token')
    }
    return null
  },

  // Remove refresh token
  removeRefreshToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('refresh_token')
    }
  },

  // Save user data
  saveUser: (user: User) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_data', JSON.stringify(user))
    }
  },

  // Get user data
  getUser: (): User | null => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user_data')
      return userData ? JSON.parse(userData) : null
    }
    return null
  },

  // Remove user data
  removeUser: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_data')
    }
  },

  // Check if user is logged in
  isLoggedIn: (): boolean => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('auth_token')
    }
    return false
  },

  // Check if admin is logged in
  isAdminLoggedIn: (): boolean => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('adminToken')
    }
    return false
  },

  // Logout với API call
  logout: async () => {
    try {
      // Gọi API logout để revoke refresh token
      const refreshToken = tokenManager.getRefreshToken()
      if (refreshToken) {
        await apiClient.post('/auth/logout-advanced', { refresh_token: refreshToken })
      }
    } catch (error) {
      console.error('Logout API call failed:', error)
    } finally {
      // Xóa tất cả token và user data
      authUtils.removeToken()
      authUtils.removeAdminToken()
      authUtils.removeRefreshToken()
      authUtils.removeUser()
    }
  },

  // Check if user is admin
  isAdmin: (): boolean => {
    const user = authUtils.getUser()
    return user?.roles?.includes('admin') || false
  }
}

// Register API
export async function registerUser(data: RegisterData): Promise<ApiResponse<RegisterResponse>> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    throw new Error(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Login API
export async function loginUser(data: LoginData): Promise<ApiResponse<LoginResponse>> {
  try {
    console.log('Sending login request to:', `${API_BASE_URL}/auth/login`)
    console.log('Login data:', data)
    
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    console.log('Response status:', response.status)
    console.log('Response ok:', response.ok)

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      console.log('Error response data:', errorData)
      throw new Error(errorData?.message || `HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    console.log('Login response:', result)
    
    // Lưu token và refresh token nếu có
    if (result.success && result.data) {
      authUtils.saveToken(result.data.token)
      if (result.data.refresh_token) {
        authUtils.saveRefreshToken(result.data.refresh_token)
      }
    }
    
    return result
  } catch (error) {
    console.error('Login error:', error)
    throw new Error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Admin Login API
export async function loginAdmin(data: AdminLoginData): Promise<ApiResponse<AdminLoginResponse>> {
  try {
    console.log('Sending admin login request to:', `${API_BASE_URL}/auth/admin/login`)
    console.log('Admin login data:', data)
    
    const response = await fetch(`${API_BASE_URL}/auth/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    console.log('Admin response status:', response.status)
    console.log('Admin response ok:', response.ok)

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      console.log('Admin error response data:', errorData)
      throw new Error(errorData?.message || `HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    console.log('Admin login response:', result)
    
    // Lưu admin token nếu đăng nhập thành công
    if (result.success && result.data) {
      authUtils.saveAdminToken(result.data.token)
    }
    
    return result
  } catch (error) {
    console.error('Admin login error:', error)
    throw new Error(`Admin login failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Logout API
export async function logoutUser(): Promise<ApiResponse<any>> {
  try {
    const token = authUtils.getToken()
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    throw new Error(`Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Forgot password function
export const forgotPassword = async (data: ForgotPasswordData): Promise<ForgotPasswordResponse> => {
  try {
    const response = await fetch(`/api/backend/v1/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Failed to send reset password email')
    }

    return result.data || { message: result.message }
  } catch (error) {
    console.error('Forgot password error:', error)
    throw error
  }
}

// Change password function
export const changePassword = async (data: ChangePasswordData): Promise<ChangePasswordResponse> => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      body: JSON.stringify(data),
    })

    const result: ApiResponse<ChangePasswordResponse> = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Failed to change password')
    }

    return result.data || { message: result.message }
  } catch (error) {
    console.error('Change password error:', error)
    throw error
  }
}

// Refresh token function
export const refreshToken = async (): Promise<RefreshTokenResponse> => {
  try {
    const refresh_token = authUtils.getRefreshToken()
    if (!refresh_token) {
      throw new Error('Refresh token not found')
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token }),
    })

    const result: ApiResponse<RefreshTokenResponse> = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Failed to refresh token')
    }

    const refreshData = result.data || result as any
    
    // Save new tokens
    if (refreshData.access_token) {
      authUtils.saveToken(refreshData.access_token)
    }
    if (refreshData.refresh_token) {
      authUtils.saveRefreshToken(refreshData.refresh_token)
    }

    return refreshData
  } catch (error) {
    console.error('Refresh token error:', error)
    // If refresh fails, logout user
    authUtils.logout()
    throw error
  }
}

// Enhanced fetch with automatic token refresh
export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = authUtils.getToken()
  
  console.log('fetchWithAuth called with:', { url, method: options.method || 'GET', hasToken: !!token })
  
  if (!token) {
    console.error('No authentication token found')
    throw new Error('No authentication token found')
  }

  // Add authorization header
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  }

  console.log('fetchWithAuth making request to:', url, 'with headers:', Object.keys(headers))

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })

    console.log('fetchWithAuth response status:', response.status, 'statusText:', response.statusText)

    // If token expired (401), try to refresh and retry
    if (response.status === 401) {
      try {
        console.log('Token expired, attempting to refresh...')
        await refreshToken()
        
        // Retry with new token
        const newToken = authUtils.getToken()
        const retryHeaders = {
          ...headers,
          'Authorization': `Bearer ${newToken}`,
        }
        
        console.log('Retrying request with new token')
        return fetch(url, {
          ...options,
          headers: retryHeaders,
        })
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
        // Redirect to login or handle as needed
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        throw refreshError
      }
    }

    return response
  } catch (fetchError) {
    console.error('fetchWithAuth network error:', fetchError)
    throw fetchError
  }
}
