import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = 'http://localhost:8000'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { item_id: string } }
) {
  try {
    const { item_id } = params
    const url = `${BACKEND_URL}/api/backend/v1/cart/remove/${item_id}`
    
    console.log('🛒 Proxying DELETE remove cart item request to:', url)
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
    })

    const data = await response.json()
    console.log('📥 Remove cart item response:', data)

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('❌ Remove cart item proxy error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
