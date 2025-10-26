import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = 'http://localhost:8000'

export async function PUT(
  request: NextRequest,
  { params }: { params: { item_id: string } }
) {
  try {
    const { item_id } = params
    const body = await request.json()
    const url = `${BACKEND_URL}/api/backend/v1/cart/update/${item_id}`
    
    console.log('🛒 Proxying PUT update cart item request to:', url)
    console.log('📤 Request body:', body)
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    console.log('📥 Update cart item response:', data)

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('❌ Update cart item proxy error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
