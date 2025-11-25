import { NextRequest, NextResponse } from 'next/server'
import { backendUrl } from '@/app/api/backend/config'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    console.log('Proxying logout request to backend:', backendUrl('/api/v1/auth/logout'))

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (authHeader) {
      headers['Authorization'] = authHeader
    }

    const response = await fetch(backendUrl('/api/v1/auth/logout'), {
      method: 'POST',
      headers,
    })

    console.log('Backend logout response status:', response.status)

    const data = await response.json()
    console.log('Backend logout response data:', data)

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Logout proxy error:', error)
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
