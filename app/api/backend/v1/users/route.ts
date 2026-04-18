import { NextRequest, NextResponse } from 'next/server'
import { backendUrl } from '@/app/api/backend/config'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    const url = `${backendUrl('/api/backend/v1/users')}${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Backend request failed', status: response.status, details: JSON.stringify(data) },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Users API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')
    const body = await request.json()
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    const response = await fetch(backendUrl('/api/backend/v1/users'), {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Backend request failed', status: response.status, details: JSON.stringify(data) },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Users API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
