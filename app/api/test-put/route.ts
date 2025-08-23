import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('PUT request received:', body)
    return NextResponse.json({ 
      success: true, 
      message: 'PUT method working',
      data: body 
    })
  } catch (error) {
    console.error('PUT error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'PUT method failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    success: true, 
    message: 'GET method working' 
  })
}
