"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Menu, Search, ShoppingBag, User, X, LogOut, Shield, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useMobile } from "@/hooks/use-mobile"
import { authUtils, logoutUser, type User as UserType } from "@/lib/auth"
import { toast } from "sonner"
import { useLanguage } from "@/components/language-provider"
import LanguageSwitcher from "@/components/language-switcher"
import LogoutModal from "@/components/logout-modal"

export default function Header() {
  const router = useRouter()
  const { t } = useLanguage()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [user, setUser] = useState<UserType | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const isMobile = useMobile()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    // Check if user is logged in
    const checkAuth = () => {
      const loggedIn = authUtils.isLoggedIn()
      const userData = authUtils.getUser()
      const adminStatus = authUtils.isAdmin()
      setIsLoggedIn(loggedIn)
      setUser(userData)
      setIsAdmin(adminStatus)
    }

    checkAuth()
    window.addEventListener("scroll", handleScroll)
    
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      // Call logout API
      await logoutUser()
      
      toast.success(t('logout.success'), {
        description: "You have been signed out",
        duration: 3000,
      })
    } catch (error) {
      // Show error but still logout locally
      toast.error("Logout error", {
        description: error instanceof Error ? error.message : "Failed to logout properly",
        duration: 4000,
      })
    } finally {
      // Always clear local storage
      authUtils.logout()
      setUser(null)
      setIsLoggedIn(false)
      setIsAdmin(false)
      setIsAccountMenuOpen(false)
      setIsLogoutModalOpen(false)
      setIsLoggingOut(false)
      
      // Redirect based on current location
      if (window.location.pathname.startsWith('/admin')) {
        router.push("/admin-login")
      } else {
        router.push("/")
      }
    }
  }

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true)
    setIsAccountMenuOpen(false)
  }

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        isScrolled ? "bg-white shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className={`md:hidden ${!isScrolled ? "text-white" : ""}`}
          onClick={() => setIsMenuOpen(true)}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open menu</span>
        </Button>

        {/* Logo */}
        <Link href="/" className={`font-serif text-xl tracking-wider ${!isScrolled ? "text-white" : ""}`}>
          VIVIENNE
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex md:items-center md:gap-8">
          <Link
            href="/all-products"
            className={`text-sm tracking-wider transition-colors hover:text-gray-600 ${
              !isScrolled ? "text-white" : ""
            }`}
          >
            {t('nav.allProducts')}
          </Link>
          <Link
            href="/collections"
            className={`text-sm tracking-wider transition-colors hover:text-gray-600 ${
              !isScrolled ? "text-white" : ""
            }`}
          >
            {t('nav.collections')}
          </Link>
          <Link
            href="/collections/spring-summer-2024"
            className={`text-sm tracking-wider transition-colors hover:text-gray-600 ${
              !isScrolled ? "text-white" : ""
            }`}
          >
            Spring Summer 2024
          </Link>
          <Link
            href="/about"
            className={`text-sm tracking-wider transition-colors hover:text-gray-600 ${
              !isScrolled ? "text-white" : ""
            }`}
          >
            {t('nav.about')}
          </Link>
        </nav>

        {/* Icons */}
        <div className="flex items-center gap-4">
          <Link href="/search">
            <Button variant="ghost" size="icon" className={`hidden sm:inline-flex ${!isScrolled ? "text-white" : ""}`}>
              <Search className="h-5 w-5" />
              <span className="sr-only">{t('nav.search')}</span>
            </Button>
          </Link>

          {/* Messenger — chỉ khi đã đăng nhập */}
          {isLoggedIn && (
            <Link href="/messenger">
              <Button variant="ghost" size="icon" className={`hidden sm:inline-flex ${!isScrolled ? "text-white" : ""}`}>
                <MessageCircle className="h-5 w-5" />
                <span className="sr-only">Messenger</span>
              </Button>
            </Link>
          )}

          {/* Language Switcher */}
          <LanguageSwitcher 
            variant="ghost" 
            size="sm"
            showIcon={!isMobile}
          />

          {/* Account Dropdown */}
          <div className="relative">
            <Button
              variant="ghost"
              className={`hidden sm:inline-flex h-auto px-3 py-2 ${!isScrolled ? "text-white hover:bg-white/10" : "hover:bg-gray-100"}`}
              onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
            >
              {isLoggedIn && user ? (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium hidden md:inline">
                    {user.first_name}
                  </span>
                </div>
              ) : (
                <User className="h-5 w-5" />
              )}
              <span className="sr-only">Account</span>
            </Button>

            {isAccountMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                {isLoggedIn && user ? (
                  <>
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <Link
                      href="/account"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      {t('nav.myAccount')}
                    </Link>
                    <Link
                      href="/account"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      {t('nav.myOrders')}
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="flex items-center px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
                        onClick={() => setIsAccountMenuOpen(false)}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        {t('nav.adminPanel')}
                      </Link>
                    )}
                    <button
                      onClick={handleLogoutClick}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('nav.signOut')}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      {t('nav.signIn')}
                    </Link>
                    <Link
                      href="/register"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      {t('nav.createAccount')}
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          <Link href="/cart">
            <Button variant="ghost" size="icon" className={!isScrolled ? "text-white" : ""}>
              <ShoppingBag className="h-5 w-5" />
              <span className="sr-only">Cart</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex h-16 items-center justify-between">
              <Link href="/" className="font-serif text-xl tracking-wider">
                VIVIENNE
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                <X className="h-6 w-6" />
                <span className="sr-only">Close menu</span>
              </Button>
            </div>
            <nav className="flex flex-col gap-6 py-8">
              <Link href="/all-products" className="text-lg tracking-wider" onClick={() => setIsMenuOpen(false)}>
                {t('nav.allProducts')}
              </Link>
              <Link href="/collections" className="text-lg tracking-wider" onClick={() => setIsMenuOpen(false)}>
                {t('nav.collections')}
              </Link>
              <Link
                href="/collections/spring-summer-2024"
                className="text-lg tracking-wider"
                onClick={() => setIsMenuOpen(false)}
              >
                Spring Summer 2024
              </Link>
              <Link href="/about" className="text-lg tracking-wider" onClick={() => setIsMenuOpen(false)}>
                {t('nav.about')}
              </Link>
              <div className="mt-4 flex flex-col gap-4">
                {isLoggedIn && user ? (
                  <>
                    <div className="border-b border-gray-200 pb-4">
                      <p className="text-lg font-medium">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <Link
                      href="/account"
                      className="flex items-center gap-2 text-lg tracking-wider"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="h-5 w-5" />
                      My Account
                    </Link>
                    <Link
                      href="/account"
                      className="flex items-center gap-2 text-lg tracking-wider"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <ShoppingBag className="h-5 w-5" />
                      My Orders
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-2 text-lg tracking-wider text-blue-600"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Shield className="h-5 w-5" />
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        handleLogout()
                        setIsMenuOpen(false)
                      }}
                      className="flex items-center gap-2 text-lg tracking-wider text-left"
                    >
                      <LogOut className="h-5 w-5" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="flex items-center gap-2 text-lg tracking-wider"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/register"
                      className="flex items-center gap-2 text-lg tracking-wider"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Create Account
                    </Link>
                  </>
                )}
                <Link
                  href="/search"
                  className="flex items-center gap-2 text-lg tracking-wider"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Search className="h-5 w-5" />
                  Search
                </Link>
                {isLoggedIn && (
                  <Link
                    href="/messenger"
                    className="flex items-center gap-2 text-lg tracking-wider"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <MessageCircle className="h-5 w-5" />
                    Messenger
                  </Link>
                )}
                <Link
                  href="/cart"
                  className="flex items-center gap-2 text-lg tracking-wider"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <ShoppingBag className="h-5 w-5" />
                  Cart
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}
      
      {/* Logout Modal */}
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        isLoading={isLoggingOut}
      />
    </header>
  )
}
