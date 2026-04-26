'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getAuthData } from '@/lib/admin-auth'
import { Language, TranslationKey, getTranslation } from '@/lib/ui-translations'

interface LanguageContextType {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: TranslationKey, params?: Record<string, string>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)
const ADMIN_LANG_KEY = 'adminLanguage'

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

interface LanguageProviderProps {
  children: ReactNode
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en')
  /**
   * Chỉ ghi localStorage sau khi đã hydrate xong. Tránh effect lưu chạy cùng tick
   * với effect đọc mà `language` trong closure còn 'en' → ghi đè 'vi' mỗi lần F5.
   */
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let next: Language = 'en'
    const { user } = getAuthData()
    if (user?.preferred_locale === 'vi' || user?.preferred_locale === 'en') {
      next = user.preferred_locale
    } else {
      const adminSaved = localStorage.getItem(ADMIN_LANG_KEY) as Language
      if (adminSaved === 'en' || adminSaved === 'vi') {
        next = adminSaved
      } else {
        const siteLang = localStorage.getItem('language') as Language
        if (siteLang === 'en' || siteLang === 'vi') {
          next = siteLang
        }
      }
    }
    setLanguageState(next)
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    localStorage.setItem(ADMIN_LANG_KEY, language)
  }, [language, ready])

  const setLanguage = (next: Language) => {
    setLanguageState(next)
  }

  const t = (key: TranslationKey, params?: Record<string, string>): string => {
    let translation = getTranslation(key, language)
    if (params) {
      Object.keys(params).forEach((paramKey) => {
        translation = translation.replace(`{${paramKey}}`, params[paramKey])
      })
    }
    return translation
  }

  const value: LanguageContextType = {
    language,
    setLanguage,
    t
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}
