import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = 'http://localhost:8000'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('POST images proxy for product ID:', params.id)
    
    const body = await request.json()
    console.log('Image data to add:', body)
    
    const response = await fetch(`${BACKEND_URL}/api/v1/products/${params.id}/images`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    })

    console.log('Backend POST images response status:', response.status)
    
    const data = await response.json()
    console.log('Backend POST images response data:', data)

    return NextResponse.json(data, { 
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
  } catch (error) {
    console.error('POST images proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to add images', message: (error as Error).message },
      { status: 500 }
    )
  }
}
