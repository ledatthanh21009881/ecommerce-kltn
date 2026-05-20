import { NextRequest, NextResponse } from 'next/server'
import { backendUrl } from '@/app/api/backend/config'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')
    if (!token) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    const response = await fetch(backendUrl('/api/backend/v1/accounts/stats'), {
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
