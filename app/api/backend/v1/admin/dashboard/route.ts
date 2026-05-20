import { getBackendBaseUrl } from '@/app/api/backend/config'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')

    if (!token) {
      return NextResponse.json({ success: false, message: 'Authorization header required' }, { status: 401 })
    }

    const search = request.nextUrl.searchParams.toString()
    const qs = search ? `?${search}` : ''

    const response = await fetch(`${getBackendBaseUrl()}/api/backend/v1/admin/dashboard${qs}`, {
      method: 'GET',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Admin dashboard proxy error:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
