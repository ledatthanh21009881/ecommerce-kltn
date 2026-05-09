import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get token from request headers
    const token = request.headers.get('authorization')
    
    // Call backend API
    const backendUrl = `${process.env.BACKEND_URL || 'http://103.90.225.212:8000'}/api/v1/orders/statistics`
    
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
    console.error('Error fetching orders statistics:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch orders statistics' }, 
      { status: 500 }
    )
  }
}
