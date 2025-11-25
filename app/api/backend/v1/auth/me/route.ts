import { NextRequest, NextResponse } from 'next/server'
import { backendUrl } from '@/app/api/backend/config'

export async function GET(request: NextRequest) {
  try {
    const url = backendUrl('/api/v1/auth/me')
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
    })

    const data = await response.json()
    
    // Map user_id to customer_id (in this system, customer_id = user_id)
    if (data.success && data.data) {
      // If customer_id doesn't exist, use user_id as customer_id
      if (!data.data.customer_id && data.data.user_id) {
        data.data.customer_id = data.data.user_id
      }
      // Also ensure name field exists (combine first_name and last_name if needed)
      if (!data.data.name && (data.data.first_name || data.data.last_name)) {
        data.data.name = `${data.data.first_name || ''} ${data.data.last_name || ''}`.trim()
      }
    }
    
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('❌ Proxy error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

