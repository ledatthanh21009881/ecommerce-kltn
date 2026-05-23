import { getBackendBaseUrl } from '@/app/api/backend/config'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')
    const { searchParams } = new URL(request.url)
    
    // Forward all query parameters
    const queryString = searchParams.toString()
    const backendUrl = `${getBackendBaseUrl()}/api/backend/v1/tracking/orders${queryString ? `?${queryString}` : ''}`

    const response = await fetch(backendUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    })

    let data: any = null
    try { data = await response.json() } catch {}
    // Forward đúng status code (đặc biệt 401/403) để client interceptor xử lý refresh/logout.
    if (!response.ok) {
      return NextResponse.json(data ?? { success: false, message: 'Backend error' }, { status: response.status })
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Tracking orders API error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch tracking orders' },
      { status: 500 }
    )
  }
}
