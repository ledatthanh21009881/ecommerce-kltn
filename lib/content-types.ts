/**
 * Content Management System Type Definitions
 * 
 * Types for Content, ContentCategory, and related interfaces
 */

export interface Content {
  content_id: number
  title: string
  slug: string
  content_type: 'page' | 'blog' | 'faq' | 'policy' | 'editorial'
  content: string
  excerpt?: string
  featured_image?: string
  status: 'draft' | 'published' | 'archived' | 'scheduled'
  publish_at?: string
  display_start?: string
  display_end?: string
  meta_title?: string
  meta_description?: string
  meta_keywords?: string
  author_id?: number
  author_name?: string
  view_count: number
  created_at: string
  updated_at?: string
  categories?: ContentCategory[]
}

export interface ContentCategory {
  category_id: number
  name: string
  slug: string
  description?: string
  created_at?: string
  content_count?: number
  contents?: Content[]
}

export interface ContentStats {
  total: number
  pages: number
  blogs: number
  faqs: number
  published: number
}

export interface ContentFilters {
  content_type?: 'page' | 'blog' | 'faq' | 'policy' | 'editorial'
  status?: 'draft' | 'published' | 'archived' | 'scheduled'
  search?: string
  page?: number
  limit?: number
}

/**
 * Helper: Ensure data is an array
 */
export function ensureArray(data: any): any[] {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.items)) return data.items
  if (data && Array.isArray(data.data)) return data.data
  return []
}

/**
 * Helper: Get nested value safely
 */
export function getNestedValue(obj: any, path: string, defaultValue: any = null): any {
  return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue
}

