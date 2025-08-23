import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = 'http://localhost:8000'

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }

    console.log('DELETE proxy for category ID:', id)

    const response = await fetch(`${BACKEND_URL}/api/v1/categories/${id}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
    })

    console.log('Backend DELETE response status:', response.status)

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
    console.error('Category DELETE proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to delete category', message: (error as Error).message },
      { status: 500 }
    )
  }
}
