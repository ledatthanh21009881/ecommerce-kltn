/**
 * User-scoped order API (customer account).
 * Uses customer token (auth_token) so user pages do not call admin endpoints.
 */

import { apiUrl } from './api'
import { tokenStore } from './tokenStore'
import type { Shipper, OrderTracking } from './tracking-types'

function getCustomerToken(): string | null {
  if (typeof window === 'undefined') return null
  const authToken = localStorage.getItem('auth_token')
  if (authToken) return authToken
  return tokenStore.getAccessToken()
}

async function userFetch<T = unknown>(
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

export interface UserOrderTrackingResponse {
  shipper: Shipper | null
  orders: OrderTracking[]
}

export const userOrdersApi = {
  getOrders: (params?: URLSearchParams) =>
    userFetch<{ items: unknown[]; pagination: unknown }>(
      `api/user/orders${params ? `?${params}` : ''}`
    ),

  getOrderDetail: (orderId: string | number) =>
    userFetch<unknown>(`api/user/orders/${orderId}`),

  getOrderTracking: (orderId: string | number) =>
    userFetch<UserOrderTrackingResponse>(`api/user/orders/${orderId}/tracking`),
}
