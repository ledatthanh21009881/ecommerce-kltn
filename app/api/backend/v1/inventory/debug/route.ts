import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('🔍 Inventory debug route called')
  return NextResponse.json({ 
    message: 'Inventory debug route working',
    method: 'GET',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  console.log('🔍 Inventory debug POST route called')
  const body = await request.json()
  console.log('📋 Debug POST data:', body)
  
  return NextResponse.json({ 
    message: 'Inventory debug POST route working',
    receivedData: body,
    method: 'POST',
    timestamp: new Date().toISOString()
  })
}
