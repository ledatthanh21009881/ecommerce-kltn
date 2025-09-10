import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const url = `${BACKEND_URL}/api/backend/v1/shipping/${id}`
    
    console.log('🌐 Proxying GET request to:', url)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
    })

    const data = await response.json()
    console.log('📥 Backend response:', data)

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('❌ Proxy error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const url = `${BACKEND_URL}/api/backend/v1/shipping/${id}`
    
    console.log('🌐 Proxying PUT request to:', url)
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
    console.log('📥 Backend response:', data)

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('❌ Proxy error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const url = `${BACKEND_URL}/api/backend/v1/shipping/${id}`
    
    console.log('🌐 Proxying DELETE request to:', url)
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
    })

    const data = await response.json()
    console.log('📥 Backend response:', data)

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('❌ Proxy error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
