import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://103.90.225.212:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle Next.js 15 async params
    const resolvedParams = params instanceof Promise ? await params : params
    const token = request.headers.get('authorization')
    const contentId = resolvedParams.id
    const backendUrl = `${BACKEND_URL}/api/backend/v1/content/${contentId}`

    const response = await fetch(backendUrl, {
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
    console.error('Content detail API error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch content details',
        status_code: 200,
        data: null
      },
      { status: 200 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle Next.js 15 async params
    const resolvedParams = params instanceof Promise ? await params : params
    const token = request.headers.get('authorization')
    const contentId = resolvedParams.id
    const body = await request.json()
    const backendUrl = `${BACKEND_URL}/api/backend/v1/content/${contentId}`

    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(errorData.message || `Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Update content API error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update content',
        status_code: 200,
        data: null
      },
      { status: 200 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  console.log('[DELETE Proxy] Function called')
  try {
    // Handle Next.js 15 async params
    const resolvedParams = params instanceof Promise ? await params : params
    console.log('[DELETE Proxy] Params resolved:', resolvedParams)
    
    const token = request.headers.get('authorization')
    const contentId = resolvedParams.id
    console.log('[DELETE Proxy] Content ID extracted:', contentId, 'Type:', typeof contentId)
    
    // Validate contentId
    if (!contentId || contentId === 'undefined' || contentId === 'null' || isNaN(Number(contentId))) {
      console.error('[DELETE Proxy] Invalid content ID:', contentId, 'Resolved params:', resolvedParams)
      return NextResponse.json(
        {
          success: false,
          message: `Invalid content ID: ${contentId}`,
          status_code: 400,
          data: null
        },
        { status: 200 }
      )
    }
    
    const backendUrl = `${BACKEND_URL}/api/backend/v1/content/${contentId}`

    console.log('[DELETE Proxy] Request:', { 
      contentId, 
      contentIdType: typeof contentId,
      contentIdNumber: Number(contentId),
      backendUrl, 
      token: token ? 'present' : 'missing',
      requestUrl: request.url,
      requestMethod: request.method
    })

    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    })

    console.log('[DELETE Proxy] Backend response status:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText
    })

    // Get response text first to check if empty
    const responseText = await response.text()
    console.log('[DELETE Proxy] Backend response body:', {
      length: responseText.length,
      preview: responseText.substring(0, 200),
      isEmpty: responseText.trim().length === 0
    })

    // Parse JSON from backend - ResponseHelper always returns valid JSON
    let backendData: any
    if (!responseText.trim()) {
      // Empty response body
      console.warn('[DELETE Proxy] Backend returned empty response body')
      backendData = {
        success: response.ok && response.status === 200,
        message: response.ok && response.status === 200 ? 'Content deleted successfully' : `Backend returned empty response (HTTP ${response.status})`,
        status_code: response.status
      }
    } else {
      try {
        backendData = JSON.parse(responseText)
        console.log('[DELETE Proxy] Backend response data:', backendData)
        
        // Check if parsed result is empty object
        if (typeof backendData === 'object' && backendData !== null && Object.keys(backendData).length === 0) {
          console.warn('[DELETE Proxy] Backend returned empty object')
          backendData = {
            success: response.ok && response.status === 200,
            message: response.ok && response.status === 200 ? 'Content deleted successfully' : 'Backend returned empty object',
            status_code: response.status
          }
        }
      } catch (parseError) {
        console.error('[DELETE Proxy] Failed to parse backend JSON:', parseError, 'Response text:', responseText)
        // If backend returns invalid JSON, create default error response
        return NextResponse.json(
          {
            success: false,
            message: `Backend returned invalid JSON (HTTP ${response.status})`,
            status_code: response.status,
            data: null
          },
          { status: 200 } // Always return 200 so frontend can parse
        )
      }
    }

    // Ensure we always have a consistent structure with all required fields
    const result = {
      success: backendData?.success ?? (response.ok && response.status === 200),
      message: backendData?.message ?? backendData?.errors ?? (response.ok && response.status === 200 ? 'Content deleted successfully' : `Backend error (HTTP ${response.status})`),
      status_code: backendData?.status_code ?? response.status,
      data: backendData?.data ?? null
    }

    // Final validation - ensure success is boolean and message is string
    if (typeof result.success !== 'boolean') {
      result.success = response.ok && response.status === 200
    }
    if (typeof result.message !== 'string' || result.message.trim().length === 0) {
      result.message = result.success ? 'Content deleted successfully' : 'Failed to delete content'
    }

    console.log('[DELETE Proxy] Returning normalized response:', result)
    return NextResponse.json(result, { status: 200 }) // Always 200 for consistent frontend parsing
  } catch (error: any) {
    console.error('[DELETE Proxy] Error:', error)
    // Return structured error response
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Failed to delete content',
        status_code: 500,
        data: null
      },
      { status: 200 } // Always 200 so frontend can parse JSON
    )
  }
}

