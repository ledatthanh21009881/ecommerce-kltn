import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')
    const categoryId = params.id
    const backendUrl = `${BACKEND_URL}/api/backend/v1/content/categories/${categoryId}`

    const response = await fetch(backendUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Category detail API error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch category details',
        status_code: 200,
        data: null
      },
      { status: 200 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')
    const categoryId = params.id
    const body = await request.json()
    const backendUrl = `${BACKEND_URL}/api/backend/v1/content/categories/${categoryId}`

    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(errorData.message || `Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Update category API error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update category',
        status_code: 200,
        data: null
      },
      { status: 200 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')
    const categoryId = params.id
    const backendUrl = `${BACKEND_URL}/api/backend/v1/content/categories/${categoryId}`

    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Delete category API error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to delete category',
        status_code: 200,
        data: null
      },
      { status: 200 }
    )
  }
}

