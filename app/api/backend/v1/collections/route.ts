import { NextRequest, NextResponse } from 'next/server'
import { backendUrl } from '@/app/api/backend/config'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')
    const response = await fetch(backendUrl('/api/backend/v1/collections'), {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
    })
    const data = await response.json().catch(() => ({ success: false, message: 'Failed to fetch collections' }))
    return NextResponse.json(data, { status: response.ok ? 200 : response.status })
  } catch (error) {
    console.error('Collections GET proxy error:', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch collections' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')
    const body = await request.json()
    const response = await fetch(backendUrl('/api/backend/v1/collections'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => ({ success: false, message: 'Failed to create collection' }))
    return NextResponse.json(data, { status: response.ok ? 200 : response.status })
  } catch (error) {
    console.error('Collections POST proxy error:', error)
    return NextResponse.json({ success: false, message: 'Failed to create collection' }, { status: 500 })
  }
}
