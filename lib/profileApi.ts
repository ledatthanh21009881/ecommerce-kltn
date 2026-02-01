/**
 * Profile API - CRUD thông tin user (first_name, last_name, email, phone).
 * Dùng token customer (auth_token), proxy qua Next.js tới backend ecommerce.
 */

import { apiUrl } from './api'

function getCustomerToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

export interface ProfileUser {
  user_id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  gender?: string
  birthdate?: string | null
  avatar_url?: string | null
  account_name?: string
  roles?: string[]
  customer_id?: number
  name?: string
}

export interface UpdateProfilePayload {
  first_name: string
  last_name: string
  email: string
  phone: string
  gender?: string
  birthdate?: string | null
  avatar_url?: string | null
}

async function profileFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T | null }> {
  try {
    const token = getCustomerToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
    const response = await fetch(apiUrl(endpoint), {
      ...options,
      headers: { ...headers, ...(options.headers as Record<string, string>) },
    })
    let data: T | null = null
    try {
      data = await response.json()
    } catch {
      data = null
    }
    return { ok: response.ok, status: response.status, data }
  } catch {
    return { ok: false, status: 0, data: null }
  }
}

export const profileApi = {
  /** Lấy thông tin profile user hiện tại (GET /api/v1/auth/me) */
  getProfile: () =>
    profileFetch<{ success: boolean; data: ProfileUser }>('api/backend/v1/auth/me'),

  /** Cập nhật profile (PUT /api/v1/auth/profile) */
  updateProfile: (payload: UpdateProfilePayload) =>
    profileFetch<{ success: boolean; message?: string }>('api/backend/v1/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
}
