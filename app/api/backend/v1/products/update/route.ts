import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = 'http://localhost:8000'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }
    
    console.log('Product PUT proxy for ID:', id)
    console.log('Update data:', body)

    const response = await fetch(`${BACKEND_URL}/api/v1/products/${id}`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    })

    console.log('Backend PUT response status:', response.status)
    
    if (!response.ok) {
      console.log('Backend PUT failed with status:', response.status)
      const errorText = await response.text()
      console.log('Backend PUT error response:', errorText)
      
      return NextResponse.json(
        { error: 'Backend request failed', status: response.status, details: errorText },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    console.log('Backend PUT response data:', data)

    return NextResponse.json(data, { 
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
  } catch (error) {
    console.error('Product PUT proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to update product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
