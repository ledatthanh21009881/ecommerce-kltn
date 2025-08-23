import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Inventory test route working',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return NextResponse.json({ 
    message: 'Inventory test POST working',
    receivedData: body,
    timestamp: new Date().toISOString()
  })
}
