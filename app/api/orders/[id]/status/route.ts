import { getBackendBaseUrl } from '@/app/api/backend/config'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    const body = await request.json()
    const { status, reason } = body
    
    // Get token from request headers
    const token = request.headers.get('authorization')
    
    // Call backend API
    const backendUrl = `${getBackendBaseUrl()}/api/v1/orders/${id}/status`
    
    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
      body: JSON.stringify({ status, reason }),
    })
    
    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating order status:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update order status' }, 
      { status: 500 }
    )
  }
}
