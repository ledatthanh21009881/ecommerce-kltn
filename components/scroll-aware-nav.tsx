"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu } from "lucide-react"
import { authUtils } from "@/lib/auth"
import { toast } from "sonner"
import { useLanguage } from "@/components/language-provider"
import { fetchCollections } from "@/lib/collections-api"
import type { Collection } from "@/lib/collections-api"
import { fetchMainCategoriesForNav, type ShopNavCategory } from "@/lib/shop-nav-categories"
import { displayBrandSiteName } from "@/lib/utils"
import LogoutModal from "@/components/logout-modal"
import LanguageSwitcher from "@/components/language-switcher"
import { StorefrontNavMenu } from "@/components/storefront/StorefrontNavMenu"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

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
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const isCollectionPage = pathname?.startsWith("/collections/")
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
        if (d?.success && typeof nextName === "string" && nextName.trim()) {
          setSiteName(displayBrandSiteName(nextName))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (isCollectionPage) setIsCollectionOpen(true)
  }, [isCollectionPage])

  useEffect(() => {
    if (!isClient || !isHomePage) return

    const handleScroll = () => {
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight
      setIsOverVideo(scrollY < windowHeight * 0.5)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isClient, isHomePage])

  useEffect(() => {
    const handleScroll = () => {
      if (isShopOpen) setIsShopOpen(false)
      if (isCollectionOpen && !isCollectionPage) setIsCollectionOpen(false)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isShopOpen, isCollectionOpen, isCollectionPage])

  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await authUtils.logout()
      setIsLoggedIn(false)
      toast.success(t('logout.success'))
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error(t('logout.failed'))
    } finally {
      setIsLogoutModalOpen(false)
      setIsLoggingOut(false)
    }
  }

  let textColorClass = "text-black"
  let hoverColorClass = "hover:text-gray-600"

  if (isHomePage) {
    if (!isClient || isOverVideo) {
      textColorClass = "text-white drop-shadow-lg"
      hoverColorClass = "hover:text-gray-200"
    } else {
      textColorClass = "text-black"
      hoverColorClass = "hover:text-gray-600"
    }
  }

  const mobileBarOnVideo = isHomePage && isClient && isOverVideo
  const mobileBarClass = mobileBarOnVideo
    ? "text-white bg-black/25 backdrop-blur-sm border-white/10"
    : "text-black bg-white/95 backdrop-blur-md border-gray-200"

  const menuProps = {
    siteName,
    isShopOpen,
    setIsShopOpen,
    isCollectionOpen,
    setIsCollectionOpen,
    collections,
    shopCategories,
    isLoggedIn,
    onLogoutClick: () => setIsLogoutModalOpen(true),
  }

  return (
    <>
      {/* Mobile top bar */}
      <header
        className={`fixed top-0 left-0 right-0 z-[110] flex md:hidden items-center justify-between gap-2 border-b px-4 py-3 ${mobileBarClass}`}
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <Link
          href="/"
          className="text-sm font-bold uppercase tracking-wider truncate min-w-0"
        >
          {siteName}
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <LanguageSwitcher variant="ghost" size="sm" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            aria-label="Open menu"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="pointer-events-auto fixed left-0 top-0 z-[100] hidden h-full w-56 overflow-y-auto bg-transparent p-8 md:flex md:flex-col">
        <StorefrontNavMenu
          {...menuProps}
          textColorClass={textColorClass}
          hoverColorClass={hoverColorClass}
        />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[min(100vw-2rem,18rem)] p-6 pt-8">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <StorefrontNavMenu
            {...menuProps}
            textColorClass="text-black"
            hoverColorClass="hover:text-gray-600"
            onNavigate={() => setMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => !isLoggingOut && setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        isLoading={isLoggingOut}
      />
    </>
  )
}
