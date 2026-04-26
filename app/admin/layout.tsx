'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  ShoppingBag, 
  Users, 
  Settings, 
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
  CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import UserHeader from '@/components/ui/user-header'
import { getAuthData, clearAuthData, AdminUser, checkAndRefreshAuth, updateAdminUserPreferredLocale } from '@/lib/admin-auth'
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Languages } from 'lucide-react'

function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { language, setLanguage, t } = useLanguage()

  const handleLanguageChange = async (value: 'en' | 'vi') => {
    setLanguage(value)
    const { token } = getAuthData()
    if (!token) return
    try {
      const r = await fetch('/api/backend/v1/auth/admin/locale', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ preferred_locale: value }),
      })
      const data = await r.json()
      if (data?.success) {
        updateAdminUserPreferredLocale(value)
      } else {
        toast.error(t('settingsSaveFailed'))
      }
    } catch {
      toast.error(t('settingsSaveError'))
    }
  }
  // Mặc định sidebar mở full khi load lần đầu
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [user, setUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      console.log('AdminLayout useEffect - checking authentication...')
      
      // Check and refresh auth if needed
      const isValid = await checkAndRefreshAuth()
      
      if (!isValid) {
        console.log('Redirecting to login - no valid auth or refresh failed')
        clearAuthData()
        router.push('/admin-login')
        setIsLoading(false)
        return
      }

      const { user: authUser } = getAuthData()

      // If we're on the root admin page, redirect to dashboard
      if (pathname === '/admin') {
        router.replace('/admin/dashboard')
        return
      }

      console.log('User authenticated successfully:', authUser)
      setUser(authUser)
      setIsLoading(false)
    }
    
    checkAuth()
  }, [router, pathname])

  const handleLogout = () => {
    clearAuthData()
    router.push('/admin-login')
    toast.success(t('adminLogoutSuccess'))
  }

      const menuItems = [
      {
        name: t('dashboard'),
        icon: LayoutDashboard,
        href: '/admin/dashboard'
      },
      {
        name: t('categories'),
        icon: FolderOpen,
        href: '/admin/categories'
      },
      {
        name: t('products'),
        icon: ShoppingBag,
        href: '/admin/products'
      },
      {
        name: t('orders'),
        icon: ShoppingCart,
        href: '/admin/orders'
      },
      {
        name: t('users'),
        icon: Users,
        href: '/admin/users'
    },
    {
      name: t('inventory'),
      icon: Package,
      href: '/admin/inventory'
    },
    {
      name: t('shipping'),
      icon: Truck,
      href: '/admin/shipping'
    },
    {
      name: t('promotions'),
      icon: Tag,
      href: '/admin/promotions'
    },
    {
      name: t('suppliers'),
      icon: Building2,
      href: '/admin/suppliers'
    },
    {
      name: t('purchaseReceipts'),
      icon: FileText,
      href: '/admin/purchase-receipts'
    },
    {
      name: t('content'),
      icon: FileText,
      href: '/admin/content'
    },
    {
      name: t('payments'),
      icon: CreditCard,
      href: '/admin/payments'
    },
    {
      name: t('tracking'),
      icon: Truck,
      href: '/admin/tracking'
    },
    {
      name: t('settings'),
      icon: Settings,
      href: '/admin/settings'
    }
  ]

  const isShipperDetailPage = pathname?.match(/^\/admin\/tracking\/shipper\/[^/]+$/)
  const isMessengerPage = pathname === '/admin/messenger'

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loadingAdminPanel')}</p>
        </div>
      </div>
    )
  }

  if (isShipperDetailPage) {
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    )
  }

  if (isMessengerPage) {
    return (
      <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-transparent">
        {children}
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
            <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
              <h1 className="text-xl font-bold text-gray-900">{t('adminPanel')}</h1>
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
            {/* Logout removed */}
          </div>
        </div>
      )}

      {/* Desktop sidebar - luôn hiện; thu hẹp (chỉ icon) khi sidebarOpen false */}
      <div className={`hidden lg:flex fixed inset-y-0 left-0 z-40 flex-col bg-white border-r border-gray-200 transition-[width] duration-200 ease-in-out ${sidebarOpen ? 'w-64' : 'w-16'}`}>
        <div className="flex flex-col flex-grow w-full overflow-hidden">
          <div className={`flex h-16 items-center border-b border-gray-200 shrink-0 ${sidebarOpen ? 'px-4 justify-start' : 'px-0 justify-center'}`}>
            {sidebarOpen && <h1 className="text-xl font-bold text-gray-900 whitespace-nowrap">{t('adminPanel')}</h1>}
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4 overflow-x-hidden">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                title={!sidebarOpen ? item.name : undefined}
                className={`flex items-center rounded-md transition-colors ${
                  sidebarOpen ? 'px-2 py-2 text-sm font-medium' : 'px-0 py-2.5 justify-center'
                } ${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className={`h-5 w-5 shrink-0 ${sidebarOpen ? 'mr-3' : ''}`} />
                {sidebarOpen && <span className="truncate">{item.name}</span>}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className={sidebarOpen ? 'lg:pl-64' : 'lg:pl-16'}>
        {/* Top bar: nút menu (3 gạch) + tiêu đề Admin Panel đã dịch */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(prev => !prev)}
            className="shrink-0"
            title={sidebarOpen ? t('closeMenu') : t('openMenu')}
          >
            <Menu className="h-6 w-6" />
          </Button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Language Selector */}
              <Select value={language} onValueChange={(value: 'en' | 'vi') => void handleLanguageChange(value)}>
                <SelectTrigger className="min-w-[11rem] w-auto max-w-[14rem] border-gray-200 bg-white text-gray-900">
                  <Languages className="h-4 w-4 shrink-0 mr-2" />
                  <SelectValue placeholder={t('language')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('english')}</SelectItem>
                  <SelectItem value="vi">{t('vietnamese')}</SelectItem>
                </SelectContent>
              </Select>

              <UserHeader
                userName={user.account_name || 'Admin User'}
                userEmail={user.account_name ? `${user.account_name}@example.com` : 'admin@example.com'}
                onLogout={handleLogout}
                messengerLabel={t('messenger')}
                logoutLabel={t('logout')}
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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LanguageProvider>
      <AdminLayoutContent>
        {children}
      </AdminLayoutContent>
    </LanguageProvider>
  )
}
