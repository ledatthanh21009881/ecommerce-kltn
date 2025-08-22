'use client'

import { usePathname } from "next/navigation"
import ScrollAwareNav from "@/components/scroll-aware-nav"
import ConditionalLayout from "@/components/conditional-layout"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Check if we're on an admin page or login page
  const isAdminPage = pathname?.startsWith('/admin')
  const isLoginPage = pathname === '/login'
  
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Only show customer navigation if NOT on admin pages and NOT on login page */}
      {!isAdminPage && !isLoginPage && <ScrollAwareNav />}

      {/* Main Content - full width, no margin needed since sidebar is absolutely positioned */}
      <div className="w-full">
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
      </div>
    </div>
  )
}
