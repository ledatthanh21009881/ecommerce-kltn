import { useState, useCallback } from 'react'
import { apiClient } from '@/lib/api-client'
import { tokenManager } from '@/lib/token-manager'

interface UseApiOptions {
  onError?: (error: Error) => void
  onSuccess?: (data: any) => void
}

export function useApi(options: UseApiOptions = {}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const request = useCallback(async <T = any>(
    method: 'get' | 'post' | 'put' | 'delete' | 'patch',
    endpoint: string,
    data?: any
  ): Promise<T | null> => {
    setLoading(true)
    setError(null)

    try {
      let response: any

      switch (method) {
        case 'get':
          response = await apiClient.get<T>(endpoint)
          break
        case 'post':
          response = await apiClient.post<T>(endpoint, data)
          break
        case 'put':
          response = await apiClient.put<T>(endpoint, data)
          break
        case 'delete':
          response = await apiClient.delete<T>(endpoint)
          break
        case 'patch':
          response = await apiClient.patch<T>(endpoint, data)
          break
      }

      if (response.success) {
        options.onSuccess?.(response.data)
        return response.data
      } else {
        throw new Error(response.message || 'Request failed')
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      options.onError?.(error)
      
      // Nếu là lỗi authentication, redirect về login
      if (error.message.includes('Session expired') || error.message.includes('Unauthorized')) {
        tokenManager.clearTokens()
        window.location.href = '/login'
      }
      
      return null
    } finally {
      setLoading(false)
    }
  }, [options])

  return {
    loading,
    error,
    request,
    // Convenience methods
    get: <T = any>(endpoint: string) => request<T>('get', endpoint),
    post: <T = any>(endpoint: string, data?: any) => request<T>('post', endpoint, data),
    put: <T = any>(endpoint: string, data?: any) => request<T>('put', endpoint, data),
    delete: <T = any>(endpoint: string) => request<T>('delete', endpoint),
    patch: <T = any>(endpoint: string, data?: any) => request<T>('patch', endpoint, data),
  }
}
