import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('Proxying admin login request to backend:', `${BACKEND_URL}/api/v1/auth/admin/login`)
    console.log('Request body:', body)

    const response = await fetch(`${BACKEND_URL}/api/v1/auth/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    console.log('Backend response status:', response.status)

    const data = await response.json()
    console.log('Backend response data:', data)

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Admin login proxy error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Proxy error',
        status_code: 500
      },
      { status: 500 }
    )
  }
}
