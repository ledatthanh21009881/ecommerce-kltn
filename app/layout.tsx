import type React from "react"
import "./globals.css"
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

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
})

export const metadata = {
  title: "VIVIENNE Fashion",
  description: "Elegant and timeless fashion designs",
    generator: 'v0.dev'
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
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
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
