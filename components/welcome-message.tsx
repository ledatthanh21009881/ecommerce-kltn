"use client"

import { useEffect, useState } from "react"
import { authUtils, type User } from "@/lib/auth"

export default function WelcomeMessage() {
  const [user, setUser] = useState<User | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    const userData = authUtils.getUser()
    if (userData) {
      setUser(userData)
      
      // Check if this is a fresh login (you can implement this logic)
      // For now, we'll show welcome message briefly
      const hasShownWelcome = sessionStorage.getItem('hasShownWelcome')
      if (!hasShownWelcome) {
        setShowWelcome(true)
        sessionStorage.setItem('hasShownWelcome', 'true')
        
        // Hide welcome message after 5 seconds
        setTimeout(() => {
          setShowWelcome(false)
        }, 5000)
      }
    }
  }, [])

  if (!showWelcome || !user) return null

  return (
    <div className="fixed top-20 right-4 z-50 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-sm">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-medium text-green-800">
            Welcome back, {user.first_name}!
          </h3>
          <p className="text-xs text-green-600 mt-1">
            You have successfully logged in.
          </p>
        </div>
        <button
          onClick={() => setShowWelcome(false)}
          className="ml-auto text-green-400 hover:text-green-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
