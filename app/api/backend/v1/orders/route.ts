import { NextRequest, NextResponse } from 'next/server'
import { backendUrl } from '@/app/api/backend/config'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    const url = `${backendUrl('/api/v1/orders')}${queryString ? `?${queryString}` : ''}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
    })

    // Always read as text first to handle both JSON and HTML responses
    const responseText = await response.text()
    const contentType = response.headers.get('content-type') || ''
    
    // Extract JSON from response (remove HTML warnings if any)
    let jsonText = responseText
    if (responseText.includes('<br />') || responseText.includes('<b>') || responseText.includes('Warning')) {
      const jsonMatch = responseText.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
      if (jsonMatch) {
        jsonText = jsonMatch[0]
        console.warn('⚠️ Extracted JSON from response with HTML warnings')
      }
    }
    
    // Try to parse as JSON
    let data
    try {
      if (contentType.includes('application/json') || jsonText.trim().startsWith('{') || jsonText.trim().startsWith('[')) {
        data = JSON.parse(jsonText)
        console.log('📥 Backend response:', data)
      } else {
        // Backend returned HTML (likely PHP error)
        console.error('❌ Backend returned non-JSON response:')
        console.error('Content-Type:', contentType)
        console.error('Response status:', response.status)
        console.error('Response text (first 1000 chars):', responseText.substring(0, 1000))
        
        return NextResponse.json(
          { 
            success: false, 
            message: 'Backend error: Server returned invalid response. Check backend logs.',
            error: 'Invalid content-type from backend',
            status_code: response.status
          },
          { status: 500 }
        )
      }
    } catch (parseError) {
      // Failed to parse JSON - likely HTML error page
      console.error('❌ Failed to parse backend response as JSON:')
      console.error('Content-Type:', contentType)
      console.error('Response status:', response.status)
      console.error('Response text (first 1000 chars):', responseText.substring(0, 1000))
      console.error('Parse error:', parseError)
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Backend error: Server returned invalid response. Check backend logs.',
          error: 'Failed to parse response as JSON',
          status_code: response.status
        },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('❌ Proxy error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const url = backendUrl('/api/v1/orders')
    
    console.log('🌐 Proxying POST request to:', url)
    console.log('📤 Request body:', body)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    })

    // Always read as text first to handle both JSON and HTML responses
    const responseText = await response.text()
    const contentType = response.headers.get('content-type') || ''
    
    // Extract JSON from response (remove HTML warnings if any)
    let jsonText = responseText
    // If response contains HTML warnings, try to extract JSON part
    if (responseText.includes('<br />') || responseText.includes('<b>') || responseText.includes('Warning')) {
      // Find JSON object/array in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
      if (jsonMatch) {
        jsonText = jsonMatch[0]
        console.warn('⚠️ Extracted JSON from response with HTML warnings')
      }
    }
    
    // Try to parse as JSON
    let data
    try {
      if (contentType.includes('application/json') || jsonText.trim().startsWith('{') || jsonText.trim().startsWith('[')) {
        data = JSON.parse(jsonText)
        console.log('📥 Backend response:', data)
      } else {
        // Backend returned HTML (likely PHP error)
        console.error('❌ Backend returned non-JSON response:')
        console.error('Content-Type:', contentType)
        console.error('Response status:', response.status)
        console.error('Response text (first 1000 chars):', responseText.substring(0, 1000))
        
        return NextResponse.json(
          { 
            success: false, 
            message: 'Backend error: Server returned invalid response. Check backend logs.',
            error: 'Invalid content-type from backend',
            status_code: response.status
          },
          { status: 500 }
        )
      }
    } catch (parseError) {
      // Failed to parse JSON - likely HTML error page
      console.error('❌ Failed to parse backend response as JSON:')
      console.error('Content-Type:', contentType)
      console.error('Response status:', response.status)
      console.error('Response text (first 1000 chars):', responseText.substring(0, 1000))
      console.error('Parse error:', parseError)
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Backend error: Server returned invalid response. Check backend logs.',
          error: 'Failed to parse response as JSON',
          status_code: response.status
        },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('❌ Proxy error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Internal server error',
        error: 'Proxy error'
      },
      { status: 500 }
    )
  }
}
