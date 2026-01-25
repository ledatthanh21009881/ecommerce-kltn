import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  
  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  // Validate URL is from VietQR
  if (!url.startsWith('https://img.vietqr.io/')) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status })
    }
    
    const buffer = await response.arrayBuffer()
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('QR proxy error:', error)
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 })
  }
}

