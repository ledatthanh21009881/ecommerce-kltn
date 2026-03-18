import type { ReactNode } from 'react'
import { LanguageProvider } from '@/contexts/LanguageContext'

/** Shop routes use ui-translations via contexts/LanguageContext (e.g. cart page). */
export default function ShopLayout({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>
}
