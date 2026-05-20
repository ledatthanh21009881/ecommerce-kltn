import { getBackendBaseUrl } from '@/app/api/backend/config'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')
    const orderId = params.id
    const backendUrl = `${getBackendBaseUrl()}/api/backend/v1/tracking/orders/${orderId}/history`

    const response = await fetch(backendUrl, {
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
    console.error('Order history API error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch order history' },
      { status: 500 }
    )
  }
}
