"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getProducts, getCategories, type Product, type ProductsFilters, type Category } from "@/lib/products"
import { toast } from "sonner"

// Helper function to format price
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price) + ' ₫'
}

// Helper function to get main image
const getMainImage = (product: Product): string => {
  // First try to use main_image from product
  if (product.main_image) {
    return product.main_image
  }
  
  // Then try to find main image from images array
  if (product.images && product.images.length > 0) {
    const mainImage = product.images.find(img => img.is_main === 1)
    if (mainImage && mainImage.url) return mainImage.url
    if (product.images[0] && product.images[0].url) return product.images[0].url
  }
  
  return "/placeholder.svg?height=600&width=480"
}

// Helper function to get product price
const getProductPrice = (product: Product): { price: string; originalPrice?: string } => {
  // Use list_price and compare_at_price from product
  const listPrice = parseFloat(product.list_price || '0')
  const comparePrice = parseFloat(product.compare_at_price || '0')
  
  // Check if there's a sale (compare_at_price > list_price)
  if (comparePrice > 0 && comparePrice > listPrice) {
    return {
      price: formatPrice(listPrice),
      originalPrice: formatPrice(comparePrice)
    }
  }
  
  // Use min_price and max_price if available
  if (product.min_price && product.max_price) {
    const minPrice = parseFloat(product.min_price)
    const maxPrice = parseFloat(product.max_price)
    
    if (minPrice === maxPrice) {
      return {
        price: formatPrice(minPrice)
      }
    } else {
      return {
        price: `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`
      }
    }
  }
  
  // Fallback to list_price
  return {
    price: formatPrice(listPrice)
  }
}

export default function AllProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true)
        const response = await getCategories()
        if (response.success) {
          setCategories(response.data.items)
        } else {
          toast.error("Failed to load categories")
        }
      } catch (error) {
        console.error("Error fetching categories:", error)
        toast.error("Failed to load categories")
      } finally {
        setCategoriesLoading(false)
      }
    }

    fetchCategories()
  }, [])

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        const filters: ProductsFilters = {
          limit: 100, // Get more products
          is_active: true
        }
        
        const response = await getProducts(filters)
        console.log('API Response:', response)
        if (response.success) {
          console.log('Products data:', response.data.items)
          setProducts(response.data.items)
        } else {
          toast.error("Failed to load products")
        }
      } catch (error) {
        console.error("Error fetching products:", error)
        toast.error("Failed to load products")
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  return (
    <div className="p-8 max-w-[85%] ml-[224px] mr-8">

        {/* Loading State */}
        {loading && (
          <div className="grid gap-6 grid-cols-3">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="aspect-[4/5] bg-gray-200 rounded"></div>
                <div className="mt-4 space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Products Grid */}
        {!loading && (
          <div className="grid gap-6 grid-cols-3">
            {products.map((product, index) => {
              // Skip products without valid data
              if (!product || !product.product_id || !product.product_name) {
                return null
              }
              
              const productPrice = getProductPrice(product)
              const imageSrc = getMainImage(product)
              
              return (
                <div
                  key={product.product_id}
                  className="group relative"
                >
                  <Link href={`/products/${product.product_id}`}>
                    <div className="relative overflow-hidden bg-gray-100 aspect-[4/5] w-full">
                      <Image
                        src={imageSrc}
                        alt={product.product_name || 'Product image'}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />


                    </div>

                    <div className="mt-4">
                      <h3 className="font-sans text-sm font-bold uppercase tracking-wide text-gray-800">{product.product_name}</h3>
                      <div className="mt-2">
                        <p className="text-gray-500 text-sm">{productPrice.price}</p>
                        {productPrice.originalPrice && (
                          <p className="text-xs text-gray-400 line-through mt-1">{productPrice.originalPrice}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        )}

        {/* No Products State */}
        {!loading && products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No products found</p>
          </div>
        )}

        {/* Load More Button */}
        {products.length > 0 && (
          <div className="mt-16 flex justify-center">
            <Button variant="outline" className="px-8 py-3 text-base">
              Load More Products
            </Button>
          </div>
        )}
      </div>
  )
}
