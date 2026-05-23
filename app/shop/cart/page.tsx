'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/components/language-provider'

/** Legacy route — single cart at /cart */
export default function ShopCartRedirectPage() {
  const router = useRouter()
  const { t } = useLanguage()

  useEffect(() => {
    router.replace('/cart')
  }, [router])

  return (
    <main className="min-h-screen flex items-center justify-center pt-24">
      <p className="text-gray-500">{t('common.loading')}</p>
    </main>
  )
}
