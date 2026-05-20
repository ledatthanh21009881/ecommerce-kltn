import { getBackendBaseUrl } from '@/app/api/backend/config'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    
    // Call backend API
    const backendUrl = `${getBackendBaseUrl()}/api/test/orders/${id}`
    
    const response = await fetch(backendUrl, {
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching order details:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch order details' }, 
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    
    // Get token from request headers
    const token = request.headers.get('authorization')
    
    // Call backend API
    const backendUrl = `${getBackendBaseUrl()}/api/v1/orders/${id}`
    
    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    })
    
    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete order' }, 
      { status: 500 }
    )
  }
}
