import { getBackendBaseUrl } from '@/app/api/backend/config'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const token = request.headers.get('authorization')

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Adjustment ID is required' },
        { status: 400 }
      )
    }

    const response = await fetch(`${getBackendBaseUrl()}/api/backend/v1/stock-adjustments/confirm?id=${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: token }),
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error confirming stock adjustment:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to confirm stock adjustment' },
      { status: 500 }
    )
  }
}

