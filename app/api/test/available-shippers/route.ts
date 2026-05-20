import { getBackendBaseUrl } from '@/app/api/backend/config'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${getBackendBaseUrl()}/api/test/available-shippers`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error fetching available shippers:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch available shippers' },
      { status: 500 }
    )
  }
}
