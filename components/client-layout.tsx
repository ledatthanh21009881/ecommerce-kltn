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
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      {/* Show main nav on all pages except admin, login, messenger, order map */}
      {!isAdminPage && !isLoginPage && !isMessengerPage && !isOrderMapPage && <ScrollAwareNav />}

      {/* flex-1: nội dung + footer giãn full chiều cao còn lại — footer dính đáy viewport khi trang ngắn */}
      <div className="flex w-full min-h-0 flex-1 flex-col">
        <ConditionalLayout>{children}</ConditionalLayout>
      </div>
    </div>
  )
}
