"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authUtils } from "@/lib/auth"

interface ProtectedAdminRouteProps {
  children: React.ReactNode
}

export default function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const checkAuth = () => {
      console.log('ProtectedAdminRoute: Checking auth...')
      
      const isLoggedIn = authUtils.isLoggedIn()
      const user = authUtils.getUser()
      const isAdmin = authUtils.isAdmin()
      
      console.log('Is logged in:', isLoggedIn)
      console.log('User data:', user)
      console.log('Is admin:', isAdmin)
      console.log('User roles:', user?.roles)

      if (!isLoggedIn) {
        console.log('Not logged in, redirecting to login')
        router.push("/admin-login")
        return
      }

      if (!isAdmin) {
        console.log('Not admin, redirecting to home')
        router.push("/")
        return
      }

      console.log('Admin access verified, showing content')
      setIsAuthorized(true)
      setIsLoading(false)
    }

    // Add small delay to ensure localStorage is available
    setTimeout(checkAuth, 100)
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return <>{children}</>
}
