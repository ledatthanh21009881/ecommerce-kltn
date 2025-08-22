import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')
    
    const response = await fetch(`${BACKEND_URL}/api/backend/v1/orders/available-shippers`, {
      headers: {
        'Authorization': token || '',
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