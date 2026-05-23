"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { storefrontCenteredClass, storefrontMainClass, storefrontProductGridClass } from "@/components/storefront/storefront-layout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { searchProducts, type Product } from "@/lib/products"
import { toast } from "sonner"

const formatPrice = (price: number): string => {
  return (
    new Intl.NumberFormat("vi-VN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price) + " ₫"
  )
}

const getMainImage = (product: Product): string => {
  if (product.main_image) return product.main_image
  if (product.images && product.images.length > 0) {
    const mainImage = product.images.find((img) => img.is_main === 1)
    if (mainImage?.url) return mainImage.url
    if (product.images[0]?.url) return product.images[0].url
  }
  return "/placeholder.svg?height=600&width=480"
}

const getProductPrice = (product: Product): { price: string; originalPrice?: string } => {
  const listPrice = parseFloat(product.list_price || "0")
  const comparePrice = parseFloat(product.compare_at_price || "0")

  if (comparePrice > 0 && comparePrice > listPrice) {
    return {
      price: formatPrice(listPrice),
      originalPrice: formatPrice(comparePrice),
    }
  }

  if (product.min_price && product.max_price) {
    const minPrice = parseFloat(product.min_price)
    const maxPrice = parseFloat(product.max_price)
    if (minPrice === maxPrice) return { price: formatPrice(minPrice) }
    return { price: `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}` }
  }

  return { price: formatPrice(listPrice) }
}

function SearchPageInner() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const qParam = (searchParams.get("q") ?? "").trim()

  const [input, setInput] = useState(qParam)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setInput(qParam)
  }, [qParam])

  const runSearch = useCallback(async (query: string) => {
    if (!query) {
      setProducts([])
      return
    }
    setLoading(true)
    try {
      const response = await searchProducts(query, 60)
      if (response.success && response.data?.items) {
        setProducts(response.data.items)
      } else {
        setProducts([])
        if (response.message) toast.error(response.message)
        else toast.error(t('search.couldNotLoad'))
      }
    } catch (e) {
      console.error(e)
      setProducts([])
      toast.error(t('search.couldNotLoad'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void runSearch(qParam)
  }, [qParam, runSearch])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = input.trim()
    const params = new URLSearchParams()
    params.set("type", "product")
    if (q) params.set("q", q)
    const qs = params.toString()
    router.push(qs ? `/search?${qs}` : "/search")
  }

  return (
    <div className={storefrontMainClass()}>
      <h1 className="mb-2 font-serif text-3xl font-light md:text-4xl">{t('search.title')}</h1>
      <p className="mb-6 text-sm text-gray-500">{t('search.subtitle')}</p>

      <form onSubmit={handleSubmit} className="relative mb-10 max-w-xl">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <Input
          type="search"
          name="q"
          placeholder={t('search.placeholder')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="pl-12 pr-28 text-lg"
          autoComplete="off"
        />
        <Button type="submit" className="absolute right-1 top-1/2 h-9 -translate-y-1/2 px-4">
          {t('search.submit')}
        </Button>
      </form>

      {loading && (
        <div className={storefrontProductGridClass}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[4/5] rounded bg-gray-200" />
              <div className="mt-4 space-y-2">
                <div className="h-3 rounded bg-gray-200" />
                <div className="h-3 w-1/3 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && qParam && (
        <p className="mb-6 text-sm text-gray-700">
          {products.length === 0 ? (
            <>{t('search.noResults').replace('{q}', qParam)}</>
          ) : (
            <>
              {t('search.resultsCount').replace('{count}', String(products.length)).replace('{q}', qParam)}
            </>
          )}
        </p>
      )}

      {!loading && products.length > 0 && (
        <div className={storefrontProductGridClass}>
          {products.map((product, index) => {
            if (!product?.product_id || !product.product_name) return null
            const productPrice = getProductPrice(product)
            const imageSrc = getMainImage(product)
            return (
              <motion.div
                key={product.product_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="group relative"
              >
                <Link href={`/products/${product.product_id}`}>
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-gray-100">
                    <Image
                      src={imageSrc}
                      alt={product.product_name || "Product image"}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="mt-4">
                    <h3 className="font-sans text-sm font-bold uppercase tracking-wide text-gray-800">
                      {product.product_name}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">{productPrice.price}</p>
                      {productPrice.originalPrice && (
                        <p className="mt-1 text-xs text-gray-400 line-through">{productPrice.originalPrice}</p>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className={storefrontCenteredClass('min-h-[40vh]')}>
          <p className="text-gray-500">Loading…</p>
        </div>
      }
    >
      <SearchPageInner />
    </Suspense>
  )
}
