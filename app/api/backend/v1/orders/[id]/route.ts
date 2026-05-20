import { getBackendBaseUrl } from '@/app/api/backend/config'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')

    const response = await fetch(
      `${getBackendBaseUrl()}/api/backend/v1/orders/${params.id}`,
      {
        headers: {
          Authorization: token || '',
          'Content-Type': 'application/json',
        },
      },
    )

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Proxy: Error fetching order:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch order' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')

    const response = await fetch(
      `${getBackendBaseUrl()}/api/backend/v1/orders/${params.id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: token || '',
          'Content-Type': 'application/json',
        },
      },
    )

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Proxy: Error deleting order:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete order' },
      { status: 500 },
    )
  }
}
