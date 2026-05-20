import { getBackendBaseUrl } from '@/app/api/backend/config'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')
    const { searchParams } = new URL(request.url)
    
    // Forward all query parameters
    const queryString = searchParams.toString()
    const backendUrl = `${getBackendBaseUrl()}/api/backend/v1/tracking/stats${queryString ? `?${queryString}` : ''}`

    const response = await fetch(backendUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    })

    let data: any = null
    try { data = await response.json() } catch {}
    if (!response.ok) {
      return NextResponse.json({ success: false, status: response.status, message: 'Backend error', data }, { status: 200 })
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Tracking stats API error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch tracking stats' },
      { status: 500 }
    )
  }
}
