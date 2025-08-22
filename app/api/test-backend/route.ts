import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test basic connection to backend
    const response = await fetch('http://localhost:8000/api/v1/test', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })

    console.log('Backend test response status:', response.status)
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          error: 'Backend not responding', 
          status: response.status,
          statusText: response.statusText 
        },
        { status: 500 }
      )
    }

    const data = await response.json()
    return NextResponse.json({ 
      success: true, 
      message: 'Backend connection OK',
      backend_response: data 
    })

  } catch (error) {
    console.error('Backend connection test failed:', error)
    return NextResponse.json(
      { 
        error: 'Failed to connect to backend', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
