import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const page = searchParams.get('page') || '1'
    const limit = searchParams.get('limit') || '20'

    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (search) params.append('search', search)
    if (dateFrom) params.append('date_from', dateFrom)
    if (dateTo) params.append('date_to', dateTo)
    params.append('page', page)
    params.append('limit', limit)

    // Use test route for now
    const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/v1/orders-test?${params.toString()}`
    
    const response = await fetch(backendUrl, {
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
