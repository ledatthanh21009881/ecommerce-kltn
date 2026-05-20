import { NextRequest, NextResponse } from 'next/server'
import { getBackendApiV1Base } from '@/app/api/backend/config'

const BACKEND_BASE_URL = getBackendApiV1Base()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authorization token required' 
      }, { status: 401 })
    }

    const response = await fetch(`${BACKEND_BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Send message API error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 })
  }
}
