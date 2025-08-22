"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authUtils } from "@/lib/auth"

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

export default function ProtectedRoute({ 
  children, 
  redirectTo = "/login" 
}: ProtectedRouteProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = () => {
      const loggedIn = authUtils.isLoggedIn()
      setIsAuthenticated(loggedIn)
      setIsLoading(false)

      if (!loggedIn) {
        router.push(redirectTo)
      }
    }

    checkAuth()
  }, [router, redirectTo])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
