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
      <div className="flex min-h-screen items-center justify-center p-12 ml-[224px]">
        <div className="text-sm text-gray-500">{t('common.loading')}</div>
      </div>
    )
  }

  if (error || !collection) {
    return (
      <div className="flex min-h-screen items-center justify-center p-12 ml-[224px]">
        <p className="text-sm text-gray-500">{error || t('collections.notFound')}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen ml-[264px] pl-[40px] items-start pt-0">
      {/* Text block - SVN-Gotham như GIAN SAIGON */}
      <div className="w-[360px] shrink-0 pt-0 pr-[48px] pb-12 pl-0 font-gotham">
        <h1 className="font-gotham text-[19px] font-light uppercase tracking-[2px] leading-[12px] pt-9 pb-9 opacity-[0.98] text-black mb-8 border-0 rotate-[360deg]">
          {collection.collection_name}
        </h1>
        {collection.short_description && (
          <div
            className="font-gotham text-[17px] leading-[1.8] max-w-[400px] whitespace-pre-line text-black"
            style={{ fontFamily: 'SVN-Gotham' }}
          >
            {collection.short_description}
          </div>
        )}
      </div>
      {/* Image grid - ảnh bự hơn */}
      <div className="flex-1 min-w-0 pt-0 pb-12 pl-0 pr-6">
        <div className="grid grid-cols-3 gap-x-6 gap-y-0">
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
                sizes="(min-width: 1200px) 28vw, 50vw"
                priority={i < 6}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
