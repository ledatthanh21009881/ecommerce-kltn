import { getBackendBaseUrl } from '@/app/api/backend/config'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const token = request.headers.get('authorization')

    const params = new URLSearchParams()
    if (id) params.append('id', id)

    const backendUrl = `${getBackendBaseUrl()}/api/backend/v1/content/categories?${params.toString()}`

    const response = await fetch(backendUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    })

    if (!response.ok) {
      // Return empty array instead of throwing error
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to fetch categories',
          status_code: 200,
          data: []
        },
        { status: 200 }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Categories API error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch categories',
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

    const backendUrl = `${getBackendBaseUrl()}/api/backend/v1/content/categories`

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
    console.error('Create category API error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create category',
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

