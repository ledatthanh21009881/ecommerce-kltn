"use client"

import { usePathname } from "next/navigation"
import Footer from "@/components/footer"
import WelcomeMessage from "@/components/welcome-message"

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  
  // Check if current route is admin-related, messenger, or collections (editorial layout)
  const isAdminRoute = pathname?.startsWith('/admin') || pathname?.startsWith('/admin-login')
  const isMessengerPage = pathname === '/messenger'
  const isCollectionsPage = pathname?.startsWith('/collections')
  
  if (isAdminRoute || isMessengerPage || isCollectionsPage) {
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
