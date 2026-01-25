import { NextRequest, NextResponse } from 'next/server'
import { backendUrl } from '@/app/api/backend/config'

export async function DELETE(request: NextRequest) {
  try {
    console.log('🛒 [API Route] DELETE /api/backend/v1/cart/clear')
    
    const backendUrl_full = backendUrl('/api/backend/v1/cart/clear')
    console.log('🔗 Backend URL:', backendUrl_full)
    
    const response = await fetch(backendUrl_full, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
    })

    const data = await response.json()
    console.log('📥 Clear cart response status:', response.status)
    console.log('📥 Clear cart response data:', data)

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('❌ Clear cart proxy error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: String(error) },
      { status: 500 }
    )
  }
}

