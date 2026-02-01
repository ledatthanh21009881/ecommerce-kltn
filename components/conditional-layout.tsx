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
  
  if (isAdminRoute || isMessengerPage || isCollectionsPage || isOrderMapPage) {
    return <>{children}</>
  }
  
  // For other routes, render with Footer only (no Header since we have sidebar)
  return (
    <>
      {children}
      <Footer />
      <WelcomeMessage />
    </>
  )
}
