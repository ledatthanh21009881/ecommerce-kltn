'use client'

import { useEffect, ReactNode } from 'react'
import { tokenStore } from '@/lib/tokenStore'

interface TokenRefreshProviderProps {
  children: ReactNode
}

export function TokenRefreshProvider({ children }: TokenRefreshProviderProps) {
  useEffect(() => {
    // Kiểm tra token mỗi 5 phút
    const checkTokenInterval = setInterval(async () => {
      try {
        const token = tokenStore.getAccessToken()
        if (token) {
          // Check if token is expired or will expire soon (within 5 minutes)
          if (tokenStore.isTokenExpired()) {
            console.log('Token expired or expiring soon, refreshing...')
            try {
              await tokenStore.refreshToken()
              console.log('Token refreshed successfully')
            } catch (refreshError) {
              console.error('Failed to refresh token:', refreshError)
              // Nếu refresh thất bại, redirect về login
              tokenStore.clearTokens()
              // Only redirect nếu chưa ở trang login
              if (window.location.pathname !== '/login' && window.location.pathname !== '/admin-login') {
                window.location.href = '/login'
              }
            }
          } else {
            console.log('Token is still valid, no refresh needed')
          }
        }
      } catch (error) {
        console.error('Error checking token:', error)
      }
    }, 5 * 60 * 1000) // 5 phút

    // Check immediately on mount
    const checkToken = async () => {
      try {
        const token = tokenStore.getAccessToken()
        if (token && tokenStore.isTokenExpired()) {
          console.log('Token expired on mount, refreshing...')
          try {
            await tokenStore.refreshToken()
            console.log('Token refreshed successfully on mount')
          } catch (refreshError) {
            console.error('Failed to refresh token on mount:', refreshError)
            // Don't redirect on mount, let the app handle it
          }
        }
      } catch (error) {
        console.error('Error checking token on mount:', error)
      }
    }

    checkToken()

    // Cleanup interval khi component unmount
    return () => {
      clearInterval(checkTokenInterval)
    }
  }, [])

  return <>{children}</>
}
