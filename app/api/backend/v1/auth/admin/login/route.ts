import { NextRequest, NextResponse } from 'next/server'
import { backendUrl } from '@/app/api/backend/config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const url = backendUrl('/api/v1/auth/admin/login')
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error during admin login:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to login' }, 
      { status: 500 }
    )
  }
}
