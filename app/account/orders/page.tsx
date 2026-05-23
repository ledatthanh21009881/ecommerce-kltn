'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/components/language-provider'
import { storefrontCenteredClass } from '@/components/storefront/storefront-layout'

/** Trang danh sách đơn đã gộp vào Account (tab Orders). Redirect về /account. */
export default function OrdersRedirectPage() {
  const { t } = useLanguage()
  const router = useRouter()
  useEffect(() => {
    router.replace('/account')
  }, [router])
  return (
    <main className={storefrontCenteredClass('min-h-screen bg-[#f9fafb]')}>
      <p className="text-gray-500">{t('orderDetail.redirecting')}</p>
    </main>
  )
}
