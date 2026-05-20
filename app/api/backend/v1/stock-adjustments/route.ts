import { getBackendBaseUrl } from '@/app/api/backend/config'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const status = searchParams.get('status')
    const page = searchParams.get('page') || '1'
    const limit = searchParams.get('limit') || '20'
    const token = request.headers.get('authorization')

    const params = new URLSearchParams()
    if (id) params.append('id', id)
    if (status && status !== 'all') params.append('status', status)
    params.append('page', page)
    params.append('limit', limit)

    const response = await fetch(`${getBackendBaseUrl()}/api/backend/v1/stock-adjustments?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: token }),
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error fetching stock adjustments:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch stock adjustments' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = request.headers.get('authorization')

    const response = await fetch(`${getBackendBaseUrl()}/api/backend/v1/stock-adjustments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: token }),
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error creating stock adjustment:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create stock adjustment' },
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
        { success: false, message: 'Adjustment ID is required' },
        { status: 400 }
      )
    }

    const response = await fetch(`${getBackendBaseUrl()}/api/backend/v1/stock-adjustments?id=${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: token }),
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error deleting stock adjustment:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete stock adjustment' },
      { status: 500 }
    )
  }
}

