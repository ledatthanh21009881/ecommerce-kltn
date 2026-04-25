import { NextRequest, NextResponse } from 'next/server'
import { backendUrl } from '@/app/api/backend/config'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const token = request.headers.get('authorization')
    const response = await fetch(backendUrl(`/api/backend/v1/collections/${resolvedParams.id}`), {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
    })
    const data = await response.json().catch(() => ({ success: false, message: 'Failed to fetch collection details' }))
    return NextResponse.json(data, { status: response.ok ? 200 : response.status })
  } catch (error) {
    console.error('Collections detail GET proxy error:', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch collection details' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const token = request.headers.get('authorization')
    const body = await request.json()
    const response = await fetch(backendUrl(`/api/backend/v1/collections/${resolvedParams.id}`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => ({ success: false, message: 'Failed to update collection' }))
    return NextResponse.json(data, { status: response.ok ? 200 : response.status })
  } catch (error) {
    console.error('Collections PUT proxy error:', error)
    return NextResponse.json({ success: false, message: 'Failed to update collection' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const token = request.headers.get('authorization')
    const response = await fetch(backendUrl(`/api/backend/v1/collections/${resolvedParams.id}`), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
    })
    const data = await response.json().catch(() => ({ success: false, message: 'Failed to delete collection' }))
    return NextResponse.json(data, { status: response.ok ? 200 : response.status })
  } catch (error) {
    console.error('Collections DELETE proxy error:', error)
    return NextResponse.json({ success: false, message: 'Failed to delete collection' }, { status: 500 })
  }
}
