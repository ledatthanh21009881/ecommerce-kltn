import { NextRequest, NextResponse } from 'next/server'
import { backendUrl } from '@/app/api/backend/config'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')
    
    console.log('Proxy: Fetching order', params.id, 'with token:', token ? 'present' : 'missing')
    
    const response = await fetch(backendUrl(`/api/v1/orders/${params.id}`), {
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    })

    console.log('Proxy: Backend response status:', response.status)
    
    const data = await response.json()
    console.log('Proxy: Backend response data:', data)
    
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Proxy: Error fetching order:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
