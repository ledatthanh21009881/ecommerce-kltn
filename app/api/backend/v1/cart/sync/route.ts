import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const url = `${BACKEND_URL}/api/backend/v1/cart/sync`
    
    console.log('🛒 Proxying POST sync cart request to:', url)
    console.log('📤 Request body:', body)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    console.log('📥 Sync cart response:', data)

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('❌ Sync cart proxy error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
