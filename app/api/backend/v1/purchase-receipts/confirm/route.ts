import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const token = request.headers.get('authorization')

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Receipt ID is required' },
        { status: 400 }
      )
    }

    const backendUrl = `${BACKEND_URL}/api/backend/v1/purchase-receipts/confirm?id=${id}`

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(errorData.message || `Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error confirming purchase receipt:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to confirm purchase receipt', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

