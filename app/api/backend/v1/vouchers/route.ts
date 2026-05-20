import { getBackendBaseUrl } from '@/app/api/backend/config'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') || '1'
    const limit = searchParams.get('limit') || '10'
    const search = searchParams.get('search') || ''
    
    // Build query string
    const queryParams = new URLSearchParams({
      page,
      limit,
      ...(search && { search })
    })
    
    const url = `${getBackendBaseUrl()}/api/backend/v1/vouchers?${queryParams}`
    
    console.log('🌐 Fetching vouchers from:', url)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
    })
    
    console.log('📥 Vouchers response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.log('❌ Vouchers error response:', errorText)
      return NextResponse.json(
        { success: false, message: 'Failed to fetch vouchers', error: errorText },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    console.log('✅ Vouchers response data:', data)
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('❌ Vouchers API error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('🌐 Creating voucher:', body)
    
    const response = await fetch(`${getBackendBaseUrl()}/api/backend/v1/vouchers`, {
      method: 'POST',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    console.log('📥 Create voucher response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.log('❌ Create voucher error response:', errorText)
      return NextResponse.json(
        { success: false, message: 'Failed to create voucher', error: errorText },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    console.log('✅ Create voucher response data:', data)
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('❌ Create voucher API error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
