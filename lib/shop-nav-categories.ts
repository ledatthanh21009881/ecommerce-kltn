/**
 * Main (root) product categories for storefront nav, ordered by admin `position`.
 */
export interface ShopNavCategory {
  category_id: number
  category_name: string
  slug: string
  position: number
}

type ApiCategory = {
  category_id: number
  category_name: string
  slug: string
  parent_id?: number | null
  position?: number
}

function normalizeList(data: unknown): ApiCategory[] {
  if (Array.isArray(data)) return data as ApiCategory[]
  if (data && typeof data === 'object' && 'items' in data && Array.isArray((data as { items: unknown }).items)) {
    return (data as { items: ApiCategory[] }).items
  }
  return []
}

export async function fetchMainCategoriesForNav(): Promise<ShopNavCategory[]> {
  try {
    const res = await fetch('/api/backend/v1/categories', { cache: 'no-store' })
    if (!res.ok) return []
    const json = await res.json()
    if (!json?.success) return []
    const list = normalizeList(json.data)
    return list
      .filter((c) => c.parent_id == null)
      .map((c) => ({
        category_id: c.category_id,
        category_name: c.category_name,
        slug: c.slug,
        position: Number(c.position) || 0,
      }))
      .sort((a, b) => a.position - b.position || a.category_id - b.category_id)
  } catch {
    return []
  }
}
