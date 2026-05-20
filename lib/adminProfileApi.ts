/**
 * Admin profile API — GET/PUT profile dùng adminToken (proxy Next.js → backend).
 */

import { apiUrl } from './api'
import { getAuthData } from './admin-auth'

export interface AdminProfileUser {
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
}

export interface UpdateAdminProfilePayload {
  first_name: string
  last_name: string
  email: string
  phone: string
  gender?: string
  birthdate?: string | null
  avatar_url?: string | null
}

async function adminProfileFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<{ ok: boolean; status: number; data: T | null }> {
  try {
    const { token } = getAuthData()
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

export const adminProfileApi = {
  getProfile: () =>
    adminProfileFetch<{ success: boolean; data: AdminProfileUser }>('api/backend/v1/auth/me'),

  updateProfile: (payload: UpdateAdminProfilePayload) =>
    adminProfileFetch<{ success: boolean; message?: string; errors?: Record<string, string[]> }>(
      'api/backend/v1/auth/profile',
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    ),

  uploadAvatar: (avatarBase64: string) =>
    adminProfileFetch<{ success: boolean; data?: { avatar_url?: string }; message?: string }>(
      'api/backend/v1/auth/avatar',
      {
        method: 'POST',
        body: JSON.stringify({ avatar_base64: avatarBase64 }),
      },
    ),
}
