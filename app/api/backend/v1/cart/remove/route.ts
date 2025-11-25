import { NextRequest, NextResponse } from 'next/server'
import { backendUrl } from '@/app/api/backend/config'

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const item_id = url.searchParams.get('item_id')
    
    if (!item_id) {
      return NextResponse.json(
        { success: false, message: 'Item ID is required' },
        { status: 400 }
      )
    }
    
    console.log('🛒 [API Route] DELETE /api/backend/v1/cart/remove?item_id=' + item_id)
    console.log('🛒 Item ID:', item_id)
    
    // Forward to backend: /api/backend/v1/cart/remove/{item_id}
    const backendUrl_full = backendUrl(`/api/backend/v1/cart/remove/${item_id}`)
    console.log('🔗 Backend URL:', backendUrl_full)
    
    const response = await fetch(backendUrl_full, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
    })

    const data = await response.json()
    console.log('📥 Remove cart item response status:', response.status)
    console.log('📥 Remove cart item response data:', data)

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('❌ Remove cart item proxy error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: String(error) },
      { status: 500 }
    )
  }
}

