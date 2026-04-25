import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const slug = resolvedParams.slug

    if (!slug) {
      return NextResponse.json(
        { success: false, message: 'Slug is required', status_code: 400, data: null },
        { status: 400 }
      )
    }

    const response = await fetch(`${BACKEND_URL}/api/backend/v1/content/public/slug/${slug}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })

    const data = await response.json().catch(() => ({
      success: false,
      message: 'Failed to fetch content',
      status_code: 200,
      data: null,
    }))

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Public content by slug API error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch content',
        status_code: 200,
        data: null,
      },
      { status: 200 }
    )
  }
}
