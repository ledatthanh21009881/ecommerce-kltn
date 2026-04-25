"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { authUtils } from "@/lib/auth"
import { toast } from "sonner"
import { useLanguage } from "@/components/language-provider"
import { fetchCollections } from "@/lib/collections-api"
import type { Collection } from "@/lib/collections-api"
import { fetchMainCategoriesForNav, type ShopNavCategory } from "@/lib/shop-nav-categories"

export default function ScrollAwareNav() {
  const { t } = useLanguage()
  const [siteName, setSiteName] = useState('VIVIENNE')
  const [isOverVideo, setIsOverVideo] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [isShopOpen, setIsShopOpen] = useState(false)
  const [isCollectionOpen, setIsCollectionOpen] = useState(false)
  const [collections, setCollections] = useState<Collection[]>([])
  const [shopCategories, setShopCategories] = useState<ShopNavCategory[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const isCollectionPage = pathname?.startsWith("/collections/")

  // Check if we're on the home page (has video)
  const isHomePage = pathname === "/"

  useEffect(() => {
    setIsClient(true)
    setIsLoggedIn(authUtils.isLoggedIn())
    fetchCollections().then(setCollections).catch(console.error)
    fetchMainCategoriesForNav().then(setShopCategories).catch(console.error)
    fetch('/api/site-settings')
      .then((r) => r.json())
      .then((d) => {
        const nextName = d?.data?.site_name
        if (d?.success && typeof nextName === 'string' && nextName.trim()) {
          setSiteName(nextName.trim())
        }
      })
      .catch(() => {})
  }, [])

  // Keep collection dropdown open when on a collection page
  useEffect(() => {
    if (isCollectionPage) setIsCollectionOpen(true)
  }, [isCollectionPage])

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

  // Auto-close dropdowns on scroll (except collection dropdown when on collection page)
  useEffect(() => {
    const handleScroll = () => {
      if (isShopOpen) setIsShopOpen(false)
      if (isCollectionOpen && !isCollectionPage) setIsCollectionOpen(false)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isShopOpen, isCollectionOpen, isCollectionPage])

  // Handle logout
  const handleLogout = async () => {
    try {
      await authUtils.logout()
      setIsLoggedIn(false)
      toast.success(t('logout.success'))
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error(t('logout.failed'))
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

  return (
    <div className="fixed left-0 top-0 w-56 h-full bg-transparent p-8 overflow-y-auto z-[100] pointer-events-auto">
             {/* Brand Name */}
       <div className="mb-8">
         <Link href="/" className={`text-lg font-bold uppercase tracking-wider ${textColorClass} hover:opacity-80 transition-opacity`}>
           {siteName}
         </Link>
       </div>

      {/* Shop Section */}
      <div className="mb-6 relative">
        <div className="mb-3">
          <button
            onClick={() => setIsShopOpen(!isShopOpen)}
            className={`text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors cursor-pointer`}
          >
            {t('nav.shopNav')}
          </button>
        </div>
        
        {isShopOpen && (
          <nav className="space-y-1 sidebar-nav relative z-[110] bg-transparent">
            <Link href="/all-products" className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}>
              {t('nav.shopAll')}
            </Link>
            {shopCategories.map((cat) => (
              <Link
                key={cat.category_id}
                href={`/category/${encodeURIComponent(cat.slug)}`}
                className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}
              >
                {cat.category_name}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {/* Collection Section - dropdown like SHOP */}
      <div className="mb-6 relative">
        <div className="mb-3">
          <button
            onClick={() => setIsCollectionOpen(!isCollectionOpen)}
            className={`text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors cursor-pointer`}
          >
            {t('nav.collectionNav')}
          </button>
        </div>
        {isCollectionOpen && (
          <nav className="space-y-1 sidebar-nav relative z-[110] bg-transparent mb-4">
            {collections.map((c) => {
              const isActive = pathname === `/collections/${c.slug}`
              return (
                <Link
                  key={c.collection_id}
                  href={`/collections/${c.slug}`}
                  className={`block text-xs font-bold uppercase tracking-wider py-0.5 ${
                    isActive
                      ? "text-black font-semibold"
                      : `${textColorClass} ${hoverColorClass}`
                  } transition-colors`}
                >
                  {c.collection_name}
                </Link>
              )
            })}
          </nav>
        )}
        <nav className="space-y-1 sidebar-nav">
          <Link href="/about" className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}>
            {t('nav.aboutNav')}
          </Link>
          <Link href="/search" className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}>
            {t('nav.searchNav')}
          </Link>
          <Link href="/cart" className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}>
            {t('nav.cartNav')}
          </Link>
          {isLoggedIn && (
            <>
              <Link href="/messenger" className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}>
                {t('nav.messengerNav')}
              </Link>
              <Link href="/account" className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}>
                {t('nav.accountNav')}
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Login/Logout Section */}
      <div className="mt-auto">
        {isLoggedIn ? (
          <button
            onClick={handleLogout}
            className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5 cursor-pointer`}
          >
            {t('nav.logoutNav')}
          </button>
        ) : (
          <Link href="/login" className={`block text-xs font-bold uppercase tracking-wider ${textColorClass} ${hoverColorClass} transition-colors py-0.5`}>
            {t('nav.loginNav')}
          </Link>
        )}
      </div>
    </div>
  )
}
