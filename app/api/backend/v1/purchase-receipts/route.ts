import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const supplierId = searchParams.get('supplier_id')
    const status = searchParams.get('status')
    const page = searchParams.get('page') || '1'
    const limit = searchParams.get('limit') || '20'

    const token = request.headers.get('authorization')

    // Build query string
    const params = new URLSearchParams()
    if (id) params.append('id', id)
    if (supplierId) params.append('supplier_id', supplierId)
    if (status) params.append('status', status)
    params.append('page', page)
    params.append('limit', limit)

    const backendUrl = `${BACKEND_URL}/api/backend/v1/purchase-receipts?${params.toString()}`

    const response = await fetch(backendUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Backend responded with status: ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching purchase receipts:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch purchase receipts', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = request.headers.get('authorization')

    const backendUrl = `${BACKEND_URL}/api/backend/v1/purchase-receipts`

    const response = await fetch(backendUrl, {
      method: 'POST',
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
    console.error('Error creating purchase receipt:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create purchase receipt', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()
    const token = request.headers.get('authorization')

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Receipt ID is required' },
        { status: 400 }
      )
    }

    const backendUrl = `${BACKEND_URL}/api/backend/v1/purchase-receipts?id=${id}`

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
    console.error('Error updating purchase receipt:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update purchase receipt', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const token = request.headers.get('authorization')

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Receipt ID is required' },
        { status: 400 }
      )
    }

    const backendUrl = `${BACKEND_URL}/api/backend/v1/purchase-receipts?id=${id}`

    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(errorData.message || `Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error deleting purchase receipt:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete purchase receipt', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

