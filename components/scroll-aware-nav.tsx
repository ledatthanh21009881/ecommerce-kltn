"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { authUtils } from "@/lib/auth"
import { toast } from "sonner"

export default function ScrollAwareNav() {
  const [isOverVideo, setIsOverVideo] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [isShopOpen, setIsShopOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // Check if we're on the home page (has video)
  const isHomePage = pathname === "/"

  useEffect(() => {
    setIsClient(true)
    // Check login status on mount
    setIsLoggedIn(authUtils.isLoggedIn())
  }, [])

  useEffect(() => {
    if (!isClient || !isHomePage) return

    const handleScroll = () => {
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight
      
      // If we're in the first screen (video area), use white text
      // If we've scrolled past the video, use black text
      setIsOverVideo(scrollY < windowHeight * 0.5)
    }

    // Add event listener
    window.addEventListener('scroll', handleScroll)
    
    // Check initial position immediately
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [isClient, isHomePage])

  // Handle logout
  const handleLogout = async () => {
    try {
      await authUtils.logout()
      setIsLoggedIn(false)
      toast.success('Logged out successfully')
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Logout failed')
    }
  }

  // Determine text color based on page and scroll position
  let textColorClass = "text-black" // Default for all pages
  let hoverColorClass = "hover:text-gray-600" // Default for all pages

  if (isHomePage) {
    // Only apply scroll-based color change on home page
    if (!isClient || isOverVideo) {
      textColorClass = "text-white drop-shadow-lg"
      hoverColorClass = "hover:text-gray-200"
    } else {
      textColorClass = "text-black"
      hoverColorClass = "hover:text-gray-600"
    }
  }

  // Debug: log the state
  console.log('ScrollAwareNav - isClient:', isClient, 'isHomePage:', isHomePage, 'isOverVideo:', isOverVideo, 'textColorClass:', textColorClass, 'isLoggedIn:', isLoggedIn)

  return (
    <div className="fixed left-0 top-0 w-56 h-full bg-transparent p-8 overflow-y-auto z-50 pointer-events-auto">
             {/* Brand Name */}
       <div className="mb-8">
         <Link href="/" className={`text-lg font-bold uppercase tracking-wider ${textColorClass} hover:opacity-80 transition-opacity`}>
           VIVIENNE
         </Link>
       </div>

      {/* Shop Section */}
      <div className="mb-6">
        <div className="mb-3">
          <button
            onClick={() => setIsShopOpen(!isShopOpen)}
            className={`text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors cursor-pointer`}
          >
            SHOP
          </button>
        </div>
        
        {isShopOpen && (
          <nav className="space-y-1 sidebar-nav">
            <Link href="/all-products" className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}>
              ALL
            </Link>
            <Link href="/category/tops" className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}>
              TOPS
            </Link>
            <Link href="/category/shirts" className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}>
              SHIRTS
            </Link>
            <Link href="/category/jackets" className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}>
              JACKETS & COATS
            </Link>
            <Link href="/category/skirts" className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}>
              SKIRTS
            </Link>
            <Link href="/category/pants" className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}>
              PANTS
            </Link>
            <Link href="/category/accessories" className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}>
              ACCESSORIES
            </Link>
          </nav>
        )}
      </div>

      {/* Collection Section */}
      <div className="mb-6">
                 <h2 className={`text-xs font-bold uppercase tracking-wider ${textColorClass} mb-3`}>COLLECTION</h2>
        <nav className="space-y-1 sidebar-nav">
                     <Link href="/editorial" className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}>
             EDITORIAL
           </Link>
           <Link href="/about" className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}>
             ABOUT
           </Link>
           <Link href="/search" className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}>
             SEARCH
           </Link>
           <Link href="/cart" className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}>
             CART
           </Link>
        </nav>
      </div>

      {/* Login/Logout Section */}
      <div className="mt-auto">
        {isLoggedIn ? (
          <button
            onClick={handleLogout}
            className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5 cursor-pointer`}
          >
            LOGOUT
          </button>
        ) : (
          <Link href="/login" className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}>
            LOGIN
          </Link>
        )}
      </div>
    </div>
  )
}
