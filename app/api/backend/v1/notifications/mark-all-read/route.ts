import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://103.90.225.212:8000'

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')
    const backendUrl = `${BACKEND_URL}/api/backend/v1/notifications/mark-all-read`

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
    console.error('Mark all notifications as read API error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to mark all notifications as read' },
      { status: 500 }
    )
  }
}
