import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    console.log('Inventory GET proxy')
    
    const authHeader = request.headers.get('Authorization')
    console.log('Authorization header:', authHeader)
    
    const response = await fetch(`${BACKEND_URL}/api/v1/inventory`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader || '',
      },
    })

    console.log('Backend GET response status:', response.status)

    if (!response.ok) {
      console.log('Backend GET failed with status:', response.status)
      const errorText = await response.text()
      console.log('Backend GET error response:', errorText)

      return NextResponse.json(
        { error: 'Backend request failed', status: response.status, details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('Backend GET response data:', data)

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
  } catch (error) {
    console.error('Inventory GET proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Inventory POST proxy')
    console.log('POST data:', body)
    console.log('Authorization header:', request.headers.get('Authorization'))

    const response = await fetch(`${BACKEND_URL}/api/v1/inventory`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    })

    console.log('Backend POST response status:', response.status)

    if (!response.ok) {
      console.log('Backend POST failed with status:', response.status)
      const errorText = await response.text()
      console.log('Backend POST error response:', errorText)

      return NextResponse.json(
        { error: 'Backend request failed', status: response.status, details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('Backend POST response data:', data)

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
  } catch (error) {
    console.error('Inventory POST proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to create inventory', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
