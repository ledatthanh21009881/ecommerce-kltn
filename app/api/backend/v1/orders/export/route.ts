import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    // Build query parameters
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (dateFrom) params.append('date_from', dateFrom)
    if (dateTo) params.append('date_to', dateTo)

    // Forward request to backend
    const backendUrl = `${process.env.BACKEND_URL || 'http://103.90.225.212:8000'}/api/v1/orders/export?${params.toString()}`
    
    const response = await fetch(backendUrl, {
      headers: {
        'Content-Type': 'application/json',
        // Add authorization header if needed
        // 'Authorization': `Bearer ${token}`
      }
    })

    const data = await response.json()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error exporting orders:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
