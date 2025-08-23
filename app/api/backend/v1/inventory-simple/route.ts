import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('🔍 Inventory simple GET route called')
  return NextResponse.json({ 
    message: 'Inventory simple route working',
    method: 'GET',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  console.log('🔍 Inventory simple POST route called')
  const body = await request.json()
  console.log('📋 Simple POST data:', body)
  
  return NextResponse.json({ 
    message: 'Inventory simple POST route working',
    receivedData: body,
    method: 'POST',
    timestamp: new Date().toISOString()
  })
}
