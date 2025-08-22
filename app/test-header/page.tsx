'use client'

import UserHeader from '@/components/ui/user-header'

export default function TestHeaderPage() {
  const handleLogout = () => {
    alert('Logout clicked!')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
            </div>

            {/* User Header */}
            <UserHeader
              userName="Admin User"
              userEmail="admin@example.com"
              onLogout={handleLogout}
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Header Test Page</h2>
          <p className="text-gray-600">
            This page demonstrates the new user header component with notification bell and user profile dropdown.
          </p>
        </div>
      </div>
    </div>
  )
}
