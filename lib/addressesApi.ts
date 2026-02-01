/**
 * Customer addresses API - CRUD + set default.
 * Uses customer token (auth_token), proxy via Next.js to ecommerce.
 */

import { apiUrl } from './api'

function getCustomerToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

export interface AddressItem {
  address_id: number
  user_id: number
  receiver_name: string
  phone: string
  address_line: string
  ward: string
  district: string
  province: string
  is_default: number
  lat?: number | null
  lng?: number | null
}

export interface AddressPayload {
  receiver_name: string
  phone: string
  address_line: string
  ward: string
  district: string
  province: string
  is_default?: boolean
}

async function addressFetch<T = unknown>(
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

export const addressesApi = {
  getList: () =>
    addressFetch<{ success: boolean; data: AddressItem[] }>('api/backend/v1/user/addresses'),

  create: (payload: AddressPayload) =>
    addressFetch<{ success: boolean; data?: { address_id: number }; message?: string }>(
      'api/backend/v1/user/addresses',
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  update: (id: number, payload: AddressPayload) =>
    addressFetch<{ success: boolean; message?: string }>(
      `api/backend/v1/user/addresses/${id}`,
      { method: 'PUT', body: JSON.stringify(payload) }
    ),

  delete: (id: number) =>
    addressFetch<{ success: boolean; message?: string }>(
      `api/backend/v1/user/addresses/${id}`,
      { method: 'DELETE' }
    ),

  setDefault: (id: number) =>
    addressFetch<{ success: boolean; message?: string }>(
      `api/backend/v1/user/addresses/${id}/default`,
      { method: 'PUT', body: JSON.stringify({}) }
    ),
}
