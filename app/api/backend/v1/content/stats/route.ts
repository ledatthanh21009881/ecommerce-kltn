import { getBackendBaseUrl } from '@/app/api/backend/config'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')
    const backendUrl = `${getBackendBaseUrl()}/api/backend/v1/content/stats`

    const response = await fetch(backendUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    })

    if (!response.ok) {
      // Return empty stats instead of throwing error
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to fetch stats',
          status_code: 200,
          data: {
            total: 0,
            pages: 0,
            blogs: 0,
            faqs: 0,
            published: 0
          }
        },
        { status: 200 }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Content stats API error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch stats',
        status_code: 200,
        data: {
          total: 0,
          pages: 0,
          blogs: 0,
          faqs: 0,
          published: 0
        }
      },
      { status: 200 }
    )
  }
}

