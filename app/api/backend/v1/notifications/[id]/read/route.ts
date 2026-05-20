import { getBackendBaseUrl } from '@/app/api/backend/config'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')
    const notificationId = params.id
    const backendUrl = `${getBackendBaseUrl()}/api/backend/v1/notifications/${notificationId}/read`

    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Mark notification as read API error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to mark notification as read' },
      { status: 500 }
    )
  }
}
