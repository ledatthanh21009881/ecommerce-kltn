import { NextRequest, NextResponse } from 'next/server'
import { backendUrl } from '@/app/api/backend/config'

/** Proxy GET /api/backend/v1/categories/slug/:slug -> backend GET /api/v1/categories/slug/:slug */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    if (!slug) {
      return NextResponse.json(
        { success: false, message: 'Slug is required' },
        { status: 400 }
      )
    }

    const token =
      request.headers.get('authorization') || request.headers.get('Authorization') || ''

    const backendPath = `/api/v1/categories/slug/${encodeURIComponent(slug)}`
    const response = await fetch(backendUrl(backendPath), {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        data ?? { success: false, message: 'Category not found' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Category by slug proxy error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch category' },
      { status: 500 }
    )
  }
}
