import { getBackendBaseUrl } from '@/app/api/backend/config'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')
    const response = await fetch(`${getBackendBaseUrl()}/api/v1/orders/statistics`, {
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    })
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error fetching order statistics:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch order statistics' },
      { status: 500 }
    )
  }
}
