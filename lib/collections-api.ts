const COLLECTIONS_API_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000')
  : (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000')

export interface Collection {
  collection_id: number
  collection_name: string
  slug: string
  short_description: string | null
}

export interface CollectionImage {
  image_url: string
}

export async function fetchCollections(): Promise<Collection[]> {
  const res = await fetch(`${COLLECTIONS_API_BASE}/api/collections`)
  if (!res.ok) throw new Error('Failed to fetch collections')
  const json = await res.json()
  return json.success ? json.data : json
}

export async function fetchCollectionBySlug(slug: string): Promise<Collection | null> {
  const res = await fetch(`${COLLECTIONS_API_BASE}/api/collections/${encodeURIComponent(slug)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to fetch collection')
  const json = await res.json()
  return json.success ? json.data : json
}

export async function fetchCollectionImages(collectionId: number): Promise<CollectionImage[]> {
  const res = await fetch(`${COLLECTIONS_API_BASE}/api/collections/${collectionId}/images`)
  if (!res.ok) throw new Error('Failed to fetch collection images')
  const json = await res.json()
  return json.success ? json.data : json
}
