import { getBackendBaseUrl } from '@/app/api/backend/config'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch(`${getBackendBaseUrl()}/api/v1/public/site-settings`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Public site settings proxy error:', error)
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

