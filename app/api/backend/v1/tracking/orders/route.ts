import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')
    const { searchParams } = new URL(request.url)
    
    // Forward all query parameters
    const queryString = searchParams.toString()
    const backendUrl = `${BACKEND_URL}/api/backend/v1/tracking/orders${queryString ? `?${queryString}` : ''}`

    const response = await fetch(backendUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    })

    let data: any = null
    try { data = await response.json() } catch {}
    if (!response.ok) {
      // Không ném lỗi; trả về 200 với success=false để FE tự fallback demo
      return NextResponse.json({ success: false, status: response.status, message: 'Backend error', data }, { status: 200 })
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
