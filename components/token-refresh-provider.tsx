'use client'

import { useEffect, ReactNode } from 'react'
import { tokenManager } from '@/lib/token-manager'

interface TokenRefreshProviderProps {
  children: ReactNode
}

export function TokenRefreshProvider({ children }: TokenRefreshProviderProps) {
  useEffect(() => {
    // Kiểm tra token mỗi 5 phút
    const checkTokenInterval = setInterval(async () => {
      try {
        const token = tokenManager.getAccessToken()
        if (token && tokenManager.isTokenExpired()) {
          console.log('Token expired, refreshing...')
          await tokenManager.refreshToken()
          console.log('Token refreshed successfully')
        }
      } catch (error) {
        console.error('Failed to refresh token:', error)
        // Nếu refresh thất bại, redirect về login
        tokenManager.clearTokens()
        window.location.href = '/login'
      }
    }, 5 * 60 * 1000) // 5 phút

    // Cleanup interval khi component unmount
    return () => {
      clearInterval(checkTokenInterval)
    }
  }, [])

  return <>{children}</>
}
