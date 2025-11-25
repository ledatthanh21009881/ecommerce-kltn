import { NextRequest, NextResponse } from 'next/server'
import { backendUrl } from '@/app/api/backend/config'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const url = new URL(request.url)
    const item_id = url.searchParams.get('item_id')
    
    if (!item_id) {
      return NextResponse.json(
        { success: false, message: 'Item ID is required' },
        { status: 400 }
      )
    }
    
    console.log('🛒 [API Route] PUT /api/backend/v1/cart/update?item_id=' + item_id)
    console.log('🛒 Item ID:', item_id)
    console.log('📤 Request body:', body)
    
    // Forward to backend: /api/backend/v1/cart/update/{item_id}
    const backendUrl_full = backendUrl(`/api/backend/v1/cart/update/${item_id}`)
    console.log('🔗 Backend URL:', backendUrl_full)
    
    const response = await fetch(backendUrl_full, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    console.log('📥 Update cart item response status:', response.status)
    console.log('📥 Update cart item response data:', data)

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('❌ Update cart item proxy error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: String(error) },
      { status: 500 }
    )
  }
}

