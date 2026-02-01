'use client'

import { usePathname } from "next/navigation"
import ScrollAwareNav from "@/components/scroll-aware-nav"
import ConditionalLayout from "@/components/conditional-layout"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Check if we're on an admin page, login page, messenger page, or order map (full-screen, no menu)
  const isAdminPage = pathname?.startsWith('/admin')
  const isLoginPage = pathname === '/login'
  const isMessengerPage = pathname === '/messenger'
  const isOrderMapPage = pathname?.match(/^\/account\/orders\/[^/]+\/map(\/)?$/)
  
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Show main nav on all pages except admin, login, messenger, order map */}
      {!isAdminPage && !isLoginPage && !isMessengerPage && !isOrderMapPage && <ScrollAwareNav />}

      {/* Main Content - full width, no margin needed since sidebar is absolutely positioned */}
      <div className="w-full">
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
      </div>
    </div>
  )
}
