import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import "react-quill/dist/quill.snow.css"
import { Inter, Playfair_Display } from "next/font/google"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { ThemeProvider } from "@/components/theme-provider"
import WelcomeMessage from "@/components/welcome-message"
import { Toaster } from "sonner"
import ConditionalLayout from "@/components/conditional-layout"
import { LanguageProvider } from "@/components/language-provider"
import { TokenRefreshProvider } from "@/components/token-refresh-provider"
import Link from "next/link"
import ScrollAwareNav from "@/components/scroll-aware-nav"
import ClientLayout from "@/components/client-layout"
import { displayBrandSiteName } from "@/lib/utils"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
})

const BACKEND_URL = process.env.BACKEND_URL || 'http://103.90.225.212:8000'

type PublicSiteSettings = {
  site_name?: string
  site_description?: string
  favicon_url?: string
}

async function loadPublicSiteSettings(): Promise<PublicSiteSettings> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/public/site-settings`, {
      cache: 'no-store',
    })
    const data = await response.json()
    if (!response.ok || !data?.success) return {}
    return (data?.data ?? {}) as PublicSiteSettings
  } catch {
    return {}
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadPublicSiteSettings()
  const siteName = displayBrandSiteName(settings.site_name?.trim() || "VIVIENNE")
  const description = settings.site_description?.trim() || 'Elegant and timeless fashion designs'
  const favicon = settings.favicon_url?.trim() || '/icon.png'

  return {
    title: siteName,
    description,
    generator: 'v0.dev',
    icons: {
      icon: favicon,
      shortcut: favicon,
      apple: favicon,
    },
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-white font-sans antialiased overflow-x-hidden" suppressHydrationWarning>
        <LanguageProvider>
          <TokenRefreshProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem={false}
              storageKey="vivienne-theme-v2"
            >
              <ClientLayout>
                {children}
              </ClientLayout>
              <Toaster />
            </ThemeProvider>
          </TokenRefreshProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
