import { NextRequest, NextResponse } from 'next/server'
import { backendUrl } from '@/app/api/backend/config'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    const body = await request.json()
    
    // Get token from request headers
    const token = request.headers.get('authorization')
    
    // Call backend API
    const url = backendUrl(`/api/v1/products/${id}/images`)
    
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
    console.error('Error uploading product images:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to upload product images' }, 
      { status: 500 }
    )
  }
}
