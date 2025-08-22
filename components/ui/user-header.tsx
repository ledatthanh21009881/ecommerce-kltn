'use client'

import { Bell, LogOut, User } from 'lucide-react'
import { useState } from 'react'

interface UserHeaderProps {
  userName?: string
  userEmail?: string
  onLogout?: () => void
}

export default function UserHeader({ 
  userName = "Admin User", 
  userEmail = "admin@example.com",
  onLogout 
}: UserHeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false)

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    }
    setShowDropdown(false)
  }

  return (
    <div className="flex items-center gap-4">
      {/* Notification Bell */}
      <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
        <Bell className="h-5 w-5" />
        {/* Notification badge */}
        <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
          3
        </span>
      </button>

      {/* User Profile */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {/* User Avatar */}
          <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-gray-600" />
          </div>
          
          {/* User Info */}
          <div className="text-left">
            <div className="text-sm font-medium text-gray-900">{userName}</div>
            <div className="text-xs text-gray-500">{userEmail}</div>
          </div>
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
