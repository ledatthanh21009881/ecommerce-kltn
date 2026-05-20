import { getBackendBaseUrl } from '@/app/api/backend/config'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')
    const contentId = params.id
    const backendUrl = `${getBackendBaseUrl()}/api/backend/v1/content/${contentId}/publish`

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(errorData.message || `Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Publish content API error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to publish content',
        status_code: 200,
        data: null
      },
      { status: 200 }
    )
  }
}

