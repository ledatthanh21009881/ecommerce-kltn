import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')
    const body = await request.json()
    
    const response = await fetch(`${BACKEND_URL}/api/backend/v1/orders/${params.id}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error updating order status:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update order status' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')
    const body = await request.json()
    
    const response = await fetch(`${BACKEND_URL}/api/backend/v1/orders/${params.id}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error updating order status:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update order status' },
      { status: 500 }
    )
  }
}