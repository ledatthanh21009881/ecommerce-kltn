'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  ShoppingBag, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  LayoutDashboard,
  FolderOpen,
  ShoppingCart,
  Package,
  Truck,
  Tag,
  Building2,
  FileText,
  MessageSquare,
  CreditCard,
  Star,
  Bell
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import UserHeader from '@/components/ui/user-header'
import { getAuthData, clearAuthData, AdminUser } from '@/lib/admin-auth'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    console.log('AdminLayout useEffect - checking authentication...')
    // Check authentication using utility function
    const { token, user: authUser } = getAuthData()
    
    console.log('Auth check:', { hasToken: !!token, hasUser: !!authUser })
    
    if (!token || !authUser) {
      console.log('Redirecting to login - no valid auth data')
      clearAuthData()
      router.push('/admin-login')
      setIsLoading(false)
      return
    }

    // If we're on the root admin page, redirect to dashboard
    if (pathname === '/admin') {
      router.replace('/admin/dashboard')
      return
    }

    console.log('User authenticated successfully:', authUser)
    setUser(authUser)
    setIsLoading(false)
  }, [router, pathname])

  const handleLogout = () => {
    clearAuthData()
    router.push('/admin-login')
    toast.success('Logged out successfully')
  }

  const menuItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      href: '/admin/dashboard'
    },
    {
      name: 'Products',
      icon: ShoppingBag,
      href: '/admin/products'
    },
    {
      name: 'Categories',
      icon: FolderOpen,
      href: '/admin/categories'
    },
    {
      name: 'Orders',
      icon: ShoppingCart,
      href: '/admin/orders'
    },
    {
      name: 'Users',
      icon: Users,
      href: '/admin/users'
    },
    {
      name: 'Inventory',
      icon: Package,
      href: '/admin/inventory'
    },
    {
      name: 'Shipping',
      icon: Truck,
      href: '/admin/shipping'
    },
    {
      name: 'Promotions',
      icon: Tag,
      href: '/admin/promotions'
    },
    {
      name: 'Suppliers',
      icon: Building2,
      href: '/admin/suppliers'
    },
    {
      name: 'Content',
      icon: FileText,
      href: '/admin/content'
    },
    {
      name: 'Messages',
      icon: MessageSquare,
      href: '/admin/messages'
    },
    {
      name: 'Analytics',
      icon: BarChart3,
      href: '/admin/analytics'
    },
    {
      name: 'Payments',
      icon: CreditCard,
      href: '/admin/payments'
    },
    {
      name: 'Tracking',
      icon: Truck,
      href: '/admin/tracking'
    },
    {
      name: 'Reviews',
      icon: Star,
      href: '/admin/reviews'
    },
    {
      name: 'Settings',
      icon: Settings,
      href: '/admin/settings'
    }
  ]

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
            <div className="flex h-16 items-center justify-between px-4 border-b">
              <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>
            <nav className="flex-1 space-y-1 px-2 py-4">
              {menuItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    pathname === item.href
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="border-t p-4">
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="mr-3 h-5 w-5" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4 border-b">
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="border-t p-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <UserHeader
                userName={user.account_name || 'Admin User'}
                userEmail={user.account_name ? `${user.account_name}@example.com` : 'admin@example.com'}
                onLogout={handleLogout}
              />
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          {children}
        </main>
      </div>
    </div>
  )
}
