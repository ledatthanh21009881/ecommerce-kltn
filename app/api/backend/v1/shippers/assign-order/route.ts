import { getBackendBaseUrl } from '@/app/api/backend/config'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')
    const body = await request.json()
    const backendUrl = `${getBackendBaseUrl()}/api/backend/v1/shippers/assign-order`

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Assign order API error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to assign order' },
      { status: 500 }
    )
  }
}
