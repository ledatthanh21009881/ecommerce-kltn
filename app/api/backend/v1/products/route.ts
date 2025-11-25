import { NextRequest, NextResponse } from 'next/server'
import { backendUrl } from '@/app/api/backend/config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '1000'

    // Get token from request headers
    const token = request.headers.get('authorization')
    console.log('🔍 Products API called with limit:', limit)
    console.log('🔑 Token present:', !!token)
    
    // Call backend API
    const url = `${backendUrl('/api/v1/products')}?limit=${limit}`
    console.log('🌐 Backend URL:', url)
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    })
    
    console.log('📥 Backend response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.log('❌ Backend error response:', errorText)
      throw new Error(`Backend responded with status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('✅ Backend data received, products count:', data.data?.length || 0)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch products' }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Get token from request headers
    const token = request.headers.get('authorization')
    
    // Call backend API
    const url = backendUrl('/api/v1/products')
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
      body: JSON.stringify(body),
    })
    
    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create product' }, 
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
