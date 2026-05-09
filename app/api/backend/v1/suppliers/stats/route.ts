import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://103.90.225.212:8000'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')

    const backendUrl = `${BACKEND_URL}/api/backend/v1/suppliers/stats`

    const response = await fetch(backendUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Backend responded with status: ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching supplier stats:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch supplier stats', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

