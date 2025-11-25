import { NextRequest, NextResponse } from 'next/server'
import { backendUrl } from '@/app/api/backend/config'

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Inventory ID is required' },
        { status: 400 }
      )
    }

    console.log('DELETE proxy for inventory ID:', id)

    const response = await fetch(backendUrl(`/api/v1/inventory/${id}`), {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
    })

    console.log('Backend DELETE response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.log('Backend DELETE error response:', errorText)
      return NextResponse.json(
        { error: 'Backend request failed', status: response.status, details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('Backend DELETE response data:', data)

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
  } catch (error) {
    console.error('Inventory DELETE proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to delete inventory', message: (error as Error).message },
      { status: 500 }
    )
  }
}
