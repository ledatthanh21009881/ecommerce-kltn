"use client"

import { usePathname } from "next/navigation"
import Footer from "@/components/footer"
import WelcomeMessage from "@/components/welcome-message"

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  
  // Check if current route is admin-related
  const isAdminRoute = pathname?.startsWith('/admin') || pathname?.startsWith('/admin-login')
  
  if (isAdminRoute) {
    // For admin routes, only render children without Header/Footer
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
