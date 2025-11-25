import { NextRequest, NextResponse } from 'next/server'
import { backendUrl } from '@/app/api/backend/config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('Proxying login request to backend:', backendUrl('/api/v1/auth/login'))
    console.log('Request body:', body)

    const response = await fetch(backendUrl('/api/v1/auth/login'), {
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
    console.error('Proxy error:', error)
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
