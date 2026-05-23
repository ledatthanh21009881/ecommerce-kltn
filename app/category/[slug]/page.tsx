"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  getCategoryBySlug,
  getCategories,
  getProducts,
  type Product,
  type Category,
} from "@/lib/products"
import { toast } from "sonner"
import { useLanguage } from "@/components/language-provider"

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

const getProductPrice = (
  product: Product
): { price: string; originalPrice?: string } => {
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
    if (minPrice === maxPrice) {
      return { price: formatPrice(minPrice) }
    }
    return {
      price: `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`,
    }
  }

  return { price: formatPrice(listPrice) }
}

/** Nav URL → slug trong DB */
const SLUG_ALIASES: Record<string, string> = {
  pantsv: "pants",
  jackets: "jackets-coats",
}

/** Match PHP Category::generateSlug-style names when API /slug/{x} misses */
function slugifyCategoryName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function flattenCategoryTree(raw: unknown): Category[] {
  if (!Array.isArray(raw)) return []
  const out: Category[] = []
  for (const node of raw) {
    if (!node || typeof node !== "object") continue
    const c = node as Category & { children?: unknown[] }
    if (c.category_id) out.push(c)
    if (Array.isArray(c.children) && c.children.length > 0) {
      out.push(...flattenCategoryTree(c.children))
    }
  }
  return out
}

/** PHP trả `data` là mảng categories, không phải `data.items` */
function categoriesFromListResponse(list: {
  success: boolean
  data?: Category[] | { items?: Category[] }
}): Category[] {
  if (!list.success || list.data == null) return []
  const d = list.data as Category[] | { items?: Category[] }
  if (Array.isArray(d)) {
    if (d.length && d[0] && "children" in d[0]) {
      return flattenCategoryTree(d)
    }
    return d
  }
  if (Array.isArray(d.items)) {
    if (d.items.length && d.items[0] && "children" in d.items[0]) {
      return flattenCategoryTree(d.items)
    }
    return d.items
  }
  return []
}

async function resolveCategoryBySlug(slug: string): Promise<Category | null> {
  const direct = await getCategoryBySlug(slug)
  if (direct.success) return direct.data

  const list = await getCategories()
  const items = categoriesFromListResponse(list)
  if (!items.length) return null

  const lower = slug.toLowerCase()
  for (const c of items) {
    if (!c?.category_id) continue
    const s = (c.slug || "").toLowerCase()
    if (s === lower) return c
    if (slugifyCategoryName(c.category_name || "") === lower) return c
  }
  return null
}

export default function CategoryPage() {
  const { t } = useLanguage()
  const params = useParams()
  const rawSlug = (params?.slug as string) || ""

  const slug = useMemo(() => {
    const decoded = decodeURIComponent(rawSlug).trim().toLowerCase()
    return SLUG_ALIASES[decoded] ?? decoded
  }, [rawSlug])

  const [category, setCategory] = useState<Category | null>(null)
  const [categoryMissing, setCategoryMissing] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loadingCategory, setLoadingCategory] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)

  useEffect(() => {
    if (!slug) {
      setLoadingCategory(false)
      setCategoryMissing(true)
      return
    }

    let cancelled = false

    const run = async () => {
      setLoadingCategory(true)
      setCategoryMissing(false)
      setCategory(null)

      const resolved = await resolveCategoryBySlug(slug)
      if (cancelled) return

      if (!resolved) {
        setCategoryMissing(true)
        setLoadingCategory(false)
        return
      }

      setCategory(resolved)
      setLoadingCategory(false)

      setLoadingProducts(true)
      try {
        const response = await getProducts({
          category_id: resolved.category_id,
          limit: 100,
          is_active: true,
        })
        if (cancelled) return
        if (response.success) {
          setProducts(response.data.items)
        } else {
          toast.error(t('catalog.failedProducts'))
          setProducts([])
        }
      } catch (e) {
        console.error(e)
        if (!cancelled) {
          toast.error(t('catalog.failedProducts'))
          setProducts([])
        }
      } finally {
        if (!cancelled) setLoadingProducts(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (!slug || (categoryMissing && !loadingCategory)) {
    return (
      <div className="p-8 max-w-[85%] ml-[224px] mr-8">
        <div className="py-16 text-center">
          <h1 className="font-sans text-lg font-bold uppercase tracking-wide text-gray-800">
            Category not found
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            This category does not exist or is inactive. Check the slug matches your
            admin catalog.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/all-products">View all products</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (loadingCategory) {
    return (
      <div className="p-8 max-w-[85%] ml-[224px] mr-8">
        <div className="grid gap-6 grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="aspect-[4/5] bg-gray-200 rounded" />
              <div className="mt-4 space-y-2">
                <div className="h-3 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const title = category?.category_name || slug

  return (
    <div className="p-8 max-w-[85%] ml-[224px] mr-8">
      <h1 className="font-sans text-sm font-bold uppercase tracking-wide text-gray-800 mb-8">
        {title}
      </h1>

      {loadingProducts && (
        <div className="grid gap-6 grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="aspect-[4/5] bg-gray-200 rounded" />
              <div className="mt-4 space-y-2">
                <div className="h-3 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loadingProducts && (
        <div className="grid gap-6 grid-cols-3">
          {products.map((product) => {
            if (!product?.product_id || !product.product_name) return null
            const productPrice = getProductPrice(product)
            const imageSrc = getMainImage(product)
            return (
              <div key={product.product_id} className="group relative">
                <Link href={`/products/${product.product_id}`}>
                  <div className="relative overflow-hidden bg-gray-100 aspect-[4/5] w-full">
                    <Image
                      src={imageSrc}
                      alt={product.product_name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="mt-4">
                    <h3 className="font-sans text-sm font-bold uppercase tracking-wide text-gray-800">
                      {product.product_name}
                    </h3>
                    <div className="mt-2">
                      <p className="text-gray-500 text-sm">{productPrice.price}</p>
                      {productPrice.originalPrice && (
                        <p className="text-xs text-gray-400 line-through mt-1">
                          {productPrice.originalPrice}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {!loadingProducts && products.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No products in this category</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/all-products">View all products</Link>
          </Button>
        </div>
      )}

      {products.length > 0 && (
        <div className="mt-16 flex justify-center">
          <Button variant="outline" className="px-8 py-3 text-base" asChild>
            <Link href="/all-products">All products</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
