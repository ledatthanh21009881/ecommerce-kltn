"use client"

import { usePathname } from "next/navigation"
import Footer from "@/components/footer"
import WelcomeMessage from "@/components/welcome-message"

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  
  // Check if current route is admin-related, messenger, collections, or order map (full-screen, no chrome)
  const isAdminRoute = pathname?.startsWith('/admin') || pathname?.startsWith('/admin-login')
  const isMessengerPage = pathname === '/messenger'
  const isCollectionsPage = pathname?.startsWith('/collections')
  const isOrderMapPage = pathname?.match(/^\/account\/orders\/[^/]+\/map(\/)?$/)
  const isLoginPage = pathname === '/login'
  
  if (isAdminRoute || isMessengerPage || isCollectionsPage || isOrderMapPage || isLoginPage) {
    return <>{children}</>
  }
  
  // Sticky footer: vùng main flex-1 đẩy Footer xuống đáy màn hình khi nội dung thấp (search, cart...)
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <Footer />
      <WelcomeMessage />
    </div>
  )
}
