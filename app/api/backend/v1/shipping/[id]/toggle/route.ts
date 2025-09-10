import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = 'http://localhost:8000'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const url = `${BACKEND_URL}/api/backend/v1/shipping/${id}/toggle`
    
    console.log('🌐 Proxying PATCH request to:', url)
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
    })

    const data = await response.json()
    console.log('📥 Backend response:', data)

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('❌ Proxy error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
