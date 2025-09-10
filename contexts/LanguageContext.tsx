'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Language, TranslationKey, getTranslation } from '@/lib/ui-translations'

interface LanguageContextType {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

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
  const [language, setLanguage] = useState<Language>('en')

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('adminLanguage') as Language
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'vi')) {
      setLanguage(savedLanguage)
    }
  }, [])

  // Save language to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('adminLanguage', language)
  }, [language])

  const t = (key: TranslationKey): string => {
    return getTranslation(key, language)
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
