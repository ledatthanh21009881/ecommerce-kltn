import { NextRequest, NextResponse } from 'next/server'
import { backendUrl } from '@/app/api/backend/config'

// Proxy GET /api/backend/v1/products/:id -> backend GET /api/v1/products/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    const token = request.headers.get('authorization') || request.headers.get('Authorization') || ''

    const url = new URL(backendUrl(`/api/v1/products/${id}`))

    // Forward query string (ex: ?type=size) if the page uses it
    const incomingUrl = new URL(request.url)
    url.search = incomingUrl.search

    const response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        data ?? { success: false, message: 'Backend request failed' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch product details' },
      { status: 500 }
    )
  }
}

