import { NextRequest, NextResponse } from 'next/server'
import { backendUrl } from '@/app/api/backend/config'

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')
    const body = await request.json()
    if (!token) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const userId = body.user_id ?? body.id
    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const response = await fetch(backendUrl(`/api/backend/v1/accounts/${userId}`), {
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
