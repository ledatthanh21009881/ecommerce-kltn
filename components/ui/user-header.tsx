'use client'

import { LogOut, User, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAdminMessengerUnreadCount } from '@/hooks/useAdminMessengerUnreadCount'
import AdminNotificationBell from '@/components/admin/AdminNotificationBell'

interface UserHeaderProps {
  userName?: string
  userEmail?: string
  onLogout?: () => void
  messengerLabel?: string
}

export default function UserHeader({ 
  userName = "Admin User", 
  userEmail = "admin@example.com",
  onLogout,
  messengerLabel = 'Messenger',
}: UserHeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const pathname = usePathname()
  const messengerActive = pathname === '/admin/messenger'
  const { count: unreadMessengerCount } = useAdminMessengerUnreadCount()

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    }
    setShowDropdown(false)
  }

  return (
    <div className="flex items-center gap-4">
      <Link
        href="/admin/messenger"
        className={cn(
          'relative rounded-full p-2 transition-colors',
          messengerActive
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        )}
        title={messengerLabel}
        aria-label={
          unreadMessengerCount > 0
            ? `${messengerLabel}, ${unreadMessengerCount} unread`
            : messengerLabel
        }
      >
        <MessageSquare className="h-5 w-5" />
        {unreadMessengerCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white"
            aria-hidden
          >
            {unreadMessengerCount > 99 ? '99+' : unreadMessengerCount}
          </span>
        )}
      </Link>

      <AdminNotificationBell />

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
