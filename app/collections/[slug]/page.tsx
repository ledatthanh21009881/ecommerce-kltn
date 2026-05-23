'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import {
  fetchCollectionBySlug,
  fetchCollectionImages,
  type Collection,
  type CollectionImage
} from '@/lib/collections-api'
import { useLanguage } from '@/components/language-provider'
import { storefrontCenteredClass, storefrontMainClass } from '@/components/storefront/storefront-layout'

export default function CollectionDetailPage() {
  const { t } = useLanguage()
  const params = useParams()
  const slug = params?.slug as string
  const [collection, setCollection] = useState<Collection | null>(null)
  const [images, setImages] = useState<CollectionImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setError(null)
    fetchCollectionBySlug(slug)
      .then((col) => {
        if (!col) {
          setCollection(null)
          setImages([])
          return
        }
        setCollection(col)
        return fetchCollectionImages(col.collection_id)
      })
      .then((imgs) => {
        if (imgs) setImages(imgs)
      })
      .catch((err) => {
        setError(err.message)
        setCollection(null)
        setImages([])
      })
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className={storefrontCenteredClass()}>
        <div className="text-sm text-gray-500">{t('common.loading')}</div>
      </div>
    )
  }

  if (error || !collection) {
    return (
      <div className={storefrontCenteredClass()}>
        <p className="text-sm text-gray-500">{error || t('collections.notFound')}</p>
      </div>
    )
  }

  return (
    <div className={storefrontMainClass('flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-12')}>
      <div className="w-full shrink-0 lg:w-[360px] font-gotham">
        <h1 className="font-gotham text-base sm:text-[19px] font-light uppercase tracking-[2px] leading-snug pt-2 pb-6 opacity-[0.98] text-black mb-4 lg:mb-8 border-0">
          {collection.collection_name}
        </h1>
        {collection.short_description && (
          <div
            className="font-gotham text-sm sm:text-[17px] leading-[1.8] max-w-full whitespace-pre-line text-black"
            style={{ fontFamily: 'SVN-Gotham' }}
          >
            {collection.short_description}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 w-full pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-4">
          {images.map((img, i) => (
            <div
              key={i}
              className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-100"
            >
              <Image
                src={img.image_url}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 28vw"
                priority={i < 6}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
