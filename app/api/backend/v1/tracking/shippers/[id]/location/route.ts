import { getBackendBaseUrl } from '@/app/api/backend/config'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')
    const shipperId = params.id
    const backendUrl = `${getBackendBaseUrl()}/api/backend/v1/tracking/shippers/${shipperId}/location`

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
    console.error('Shipper location API error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch shipper location' },
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
    const shipperId = params.id
    const body = await request.json()
    const backendUrl = `${getBackendBaseUrl()}/api/backend/v1/shippers/${shipperId}/location`

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Update shipper location API error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update shipper location' },
      { status: 500 }
    )
  }
}
