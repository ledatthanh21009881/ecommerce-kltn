import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Use test route for now
    const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/v1/orders-test/statistics`
    
    const response = await fetch(backendUrl, {
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching order statistics:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
