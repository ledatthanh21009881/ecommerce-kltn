import { NextRequest, NextResponse } from 'next/server'
import { backendUrl } from '@/app/api/backend/config'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Inventory ID is required' },
        { status: 400 }
      )
    }

    console.log('Inventory GET proxy for ID:', id)

    const response = await fetch(backendUrl(`/api/v1/inventory/${id}`), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
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
      { error: 'Failed to get inventory', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Inventory ID is required' },
        { status: 400 }
      )
    }

    console.log('Inventory PUT proxy for ID:', id)
    console.log('Update data:', body)

    const response = await fetch(backendUrl(`/api/v1/inventory/${id}`), {
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
      let errorText = ''
      try {
        errorText = await response.text()
        console.log('Backend PUT error response:', errorText)
      } catch (textError) {
        console.log('Could not read error response text')
        errorText = 'Unknown error'
      }

      return NextResponse.json(
        { error: 'Backend request failed', status: response.status, details: errorText },
        { status: response.status }
      )
    }

    let data
    try {
      data = await response.json()
      console.log('Backend PUT response data:', data)
    } catch (jsonError) {
      console.log('Could not parse JSON response, trying text')
      const textResponse = await response.text()
      console.log('Text response:', textResponse)
      return NextResponse.json(
        { error: 'Invalid JSON response from backend', details: textResponse },
        { status: 500 }
      )
    }

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
  } catch (error) {
    console.error('Inventory PUT proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to update inventory', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
