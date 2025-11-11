import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')
    const shipperId = params.id
    const { searchParams } = new URL(request.url)
    
    // Forward all query parameters
    const queryString = searchParams.toString()
    const backendUrl = `${BACKEND_URL}/api/backend/v1/shippers/${shipperId}/performance${queryString ? `?${queryString}` : ''}`

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
    console.error('Shipper performance API error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch shipper performance' },
      { status: 500 }
    )
  }
}
