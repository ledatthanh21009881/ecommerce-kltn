// Products API Service
import { apiClient } from './api-client'
import { getBackendBaseUrl } from './backend-base-url'

export interface Product {
  product_id: number
  product_name: string
  slug: string
  category_id: number
  short_description?: string
  description?: string
  material?: string
  list_price?: string
  compare_at_price?: string
  cost_price?: string
  stock?: number
  status?: string
  created_at: string
  updated_at: string
  is_featured?: number
  category_name?: string
  min_price?: string
  max_price?: string
  variant_count?: number
  main_image?: string
  images?: ProductImage[]
  variants?: ProductVariant[]
}

export interface ProductImage {
  image_id: number
  product_id: number
  variant_id?: number
  url: string
  media_public_id?: string
  position: number
  alt_text?: string
  image_type: string
  is_main: number
  created_at: string
  updated_at: string
  main_key?: string
}

export interface ProductVariant {
  variant_id: number
  product_id: number
  size_id?: number
  sku?: string
  stock_quantity: number
  status: string
  is_active: number
  size_name?: string
}

export interface ProductsResponse {
  success: boolean
  message: string
  status_code: number
  data: {
    items: Product[]
    pagination?: {
      current_page: number
      total_pages: number
      total_items: number
      items_per_page: number
    }
  }
}

export interface ProductsFilters {
  category_id?: number
  search?: string
  min_price?: number
  max_price?: number
  is_featured?: boolean
  is_active?: boolean
  limit?: number
  page?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

// Get all products with optional filters
export async function getProducts(filters: ProductsFilters = {}): Promise<ProductsResponse> {
  try {
    const queryParams = new URLSearchParams()
    
    // Add filters to query params
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString())
      }
    })
    
    // IMPORTANT:
    // Use Next.js proxy route so it forwards to the real PHP backend on VPS.
    // Calling `/api/products` is rewritten to `localhost:8000` and fails on production.
    const endpoint = `/api/backend/v1/products${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    
    // Use fetch directly since this is a public endpoint
    const response = await fetch(endpoint)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to fetch products:', error)
    throw error
  }
}

// Get featured products
export async function getFeaturedProducts(limit: number = 10): Promise<ProductsResponse> {
  return getProducts({ is_featured: true, limit })
}

// Get products by category
export async function getProductsByCategory(categoryId: number, limit: number = 20): Promise<ProductsResponse> {
  return getProducts({ category_id: categoryId, limit })
}

// Search products
export async function searchProducts(query: string, limit: number = 20): Promise<ProductsResponse> {
  return getProducts({ search: query, limit })
}

// Get single product by ID
export async function getProductById(productId: number): Promise<Product> {
  try {
    // Always call through Next proxy route so it works on VPS.
    const response = await fetch(`/api/backend/v1/products/${productId}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch product')
    }
    
    return data.data
  } catch (error) {
    console.error('Failed to fetch product:', error)
    throw error
  }
}

// Category interfaces
export interface Category {
  category_id: number
  category_name: string
  slug?: string
  description?: string
  is_active?: number
  created_at?: string
  updated_at?: string
}

export interface CategoriesResponse {
  success: boolean
  message: string
  status_code: number
  data: {
    items: Category[]
    pagination?: {
      current_page: number
      total_pages: number
      total_items: number
      items_per_page: number
    }
  }
}

/** Resolve category by URL slug (active categories only on backend). */
export async function getCategoryBySlug(
  slug: string
): Promise<{ success: true; data: Category } | { success: false; message?: string }> {
  try {
    const trimmed = slug?.trim()
    if (!trimmed) {
      return { success: false, message: 'Slug is required' }
    }
    const response = await fetch(
      `/api/backend/v1/categories/slug/${encodeURIComponent(trimmed)}`
    )
    const data = await response.json().catch(() => null)
    if (!response.ok || !data?.success || !data?.data?.category_id) {
      return {
        success: false,
        message: data?.message || 'Category not found',
      }
    }
    return { success: true, data: data.data as Category }
  } catch (error) {
    console.error('Failed to fetch category by slug:', error)
    return { success: false, message: 'Failed to fetch category' }
  }
}

// Get all categories
export async function getCategories(): Promise<CategoriesResponse> {
  try {
    // Use Next.js proxy route to hit the real backend (not localhost rewrite)
    const response = await fetch('/api/backend/v1/categories')
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    throw error
  }
}

function getAdminAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('adminToken') || localStorage.getItem('auth_token')
}

/** Admin product API helpers (used by edit/details pages). */
export const productApi = {
  async getProduct(productId: number): Promise<{ success: boolean; data: Product; message?: string }> {
    const data = await getProductById(productId)
    return { success: true, data }
  },

  async deleteProductImage(_productId: number, imageId: number): Promise<unknown> {
    const token = getAdminAuthToken()
    const response = await fetch(`/api/backend/v1/product-images/${imageId}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    const body = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(
        (body as { message?: string })?.message || `Failed to delete image (${response.status})`,
      )
    }
    return body
  },
}

// Form data interface for product creation/editing
export interface ProductFormData {
  product_name: string
  slug: string
  description: string
  short_description: string
  category_id: number
  material: string
  list_price: number
  compare_at_price: number
  cost_price: number
  price: number
  stock_quantity: number
  status: string
  is_featured: boolean
  variants: ProductVariant[]
  images: ProductImage[]
}
