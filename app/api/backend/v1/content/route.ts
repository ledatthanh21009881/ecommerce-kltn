import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const slug = searchParams.get('slug')
    const content_type = searchParams.get('content_type')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = searchParams.get('page') || '1'
    const limit = searchParams.get('limit') || '20'

    // Get token from request headers
    const token = request.headers.get('authorization')

    // Build query string
    const params = new URLSearchParams()
    if (id) params.append('id', id)
    if (slug) params.append('slug', slug)
    if (content_type) params.append('content_type', content_type)
    if (status) params.append('status', status)
    if (search) params.append('search', search)
    params.append('page', page)
    params.append('limit', limit)

    const backendUrl = `${BACKEND_URL}/api/backend/v1/content?${params.toString()}`

    const response = await fetch(backendUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    })

    // Handle errors gracefully (return 200 OK even on backend errors)
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error('Content API error:', errorText)
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to fetch content',
          status_code: 200,
          data: []
        },
        { status: 200 }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching content:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch content',
        status_code: 200,
        data: []
      },
      { status: 200 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = request.headers.get('authorization')

    const backendUrl = `${BACKEND_URL}/api/backend/v1/content`

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(errorData.message || `Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating content:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create content',
        status_code: 200,
        data: null
      },
      { status: 200 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

