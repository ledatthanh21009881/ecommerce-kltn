import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Proxy: Fetching order', params.id)
    
    const token = request.headers.get('authorization')
    console.log('Token:', token ? 'present' : 'missing')
    
    const response = await fetch(`http://103.90.225.212:8000/api/v1/orders/${params.id}`, {
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    })

    console.log('Backend response status:', response.status)
    
    const data = await response.json()
    console.log('Backend response data:', data)
    
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
