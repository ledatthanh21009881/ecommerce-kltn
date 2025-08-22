"use client"

import { useLanguage } from '@/components/language-provider'
import { Button } from '@/components/ui/button'
import { Globe } from 'lucide-react'
import { useState } from 'react'

interface LanguageSwitcherProps {
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'sm' | 'default' | 'lg'
  showIcon?: boolean
}

export default function LanguageSwitcher({ 
  variant = 'ghost', 
  size = 'default',
  showIcon = true 
}: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'vi' : 'en'
    setLanguage(newLang)
  }

  return (
    <div className="relative">
      <Button 
        variant={variant} 
        size={size}
        onClick={toggleLanguage}
        className="flex items-center gap-2"
      >
        {showIcon && <Globe className="h-4 w-4" />}
        <span className="font-medium">
          {language === 'en' ? 'EN' : 'VI'}
        </span>
      </Button>
    </div>
  )
}
