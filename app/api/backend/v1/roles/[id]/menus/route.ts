import { NextRequest, NextResponse } from 'next/server'
import { backendUrl } from '@/app/api/backend/config'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const token = request.headers.get('authorization')
    if (!token) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const { id } = await context.params
    const response = await fetch(backendUrl(`/api/backend/v1/roles/${id}/menus`), {
      headers: { Authorization: token, 'Content-Type': 'application/json' },
    })
    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json({ error: 'Backend request failed', details: data }, { status: response.status })
    }
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const token = request.headers.get('authorization')
    const body = await request.json()
    if (!token) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const { id } = await context.params
    const response = await fetch(backendUrl(`/api/backend/v1/roles/${id}/menus`), {
      method: 'PUT',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json({ error: 'Backend request failed', details: data }, { status: response.status })
    }
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    )
  }
}
