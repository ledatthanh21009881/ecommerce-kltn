import { getBackendBaseUrl } from '@/app/api/backend/config'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    console.log('🌐 Fetching voucher by ID:', id)
    
    const response = await fetch(`${getBackendBaseUrl()}/api/backend/v1/vouchers/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
    })
    
    console.log('📥 Voucher by ID response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.log('❌ Voucher by ID error response:', errorText)
      return NextResponse.json(
        { success: false, message: 'Failed to fetch voucher', error: errorText },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    console.log('✅ Voucher by ID response data:', data)
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('❌ Voucher by ID API error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    
    console.log('🌐 Updating voucher:', id, body)
    
    const response = await fetch(`${getBackendBaseUrl()}/api/backend/v1/vouchers/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    console.log('📥 Update voucher response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.log('❌ Update voucher error response:', errorText)
      return NextResponse.json(
        { success: false, message: 'Failed to update voucher', error: errorText },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    console.log('✅ Update voucher response data:', data)
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('❌ Update voucher API error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    console.log('🌐 Deleting voucher:', id)
    
    const response = await fetch(`${getBackendBaseUrl()}/api/backend/v1/vouchers/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Content-Type': 'application/json',
      },
    })
    
    console.log('📥 Delete voucher response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.log('❌ Delete voucher error response:', errorText)
      return NextResponse.json(
        { success: false, message: 'Failed to delete voucher', error: errorText },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    console.log('✅ Delete voucher response data:', data)
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('❌ Delete voucher API error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
