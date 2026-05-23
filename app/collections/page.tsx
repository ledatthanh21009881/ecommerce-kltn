'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchCollections } from '@/lib/collections-api'
import { useLanguage } from '@/components/language-provider'
import { storefrontCenteredClass } from '@/components/storefront/storefront-layout'

export default function CollectionsIndexPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCollections()
      .then((cols) => {
        if (cols.length > 0) {
          router.replace(`/collections/${cols[0].slug}`)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className={storefrontCenteredClass()}>
        <div className="text-sm text-gray-500">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className={storefrontCenteredClass()}>
      <p className="text-sm text-gray-500">{t('collections.noCollections')}</p>
    </div>
  )
}
