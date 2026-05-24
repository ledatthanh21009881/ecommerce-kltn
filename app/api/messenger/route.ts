import { NextRequest, NextResponse } from 'next/server'
import { backendUrl } from '@/app/api/backend/config'

/** Parse JSON even when PHP warnings prepend HTML to the response body. */
function parseBackendJson(text: string): unknown {
  const trimmed = text.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1))
    }
    throw new Error('Invalid JSON from backend')
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const conversationId = searchParams.get('conversation_id')
    const customerId = searchParams.get('customer_id')
    const shipperId = searchParams.get('shipper_id')
    const orderId = searchParams.get('order_id')
    const label = searchParams.get('label')
    const myShipperConversations = searchParams.get('my_shipper_conversations')
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authorization token required' 
      }, { status: 401 })
    }

    let url = ''
    switch (action) {
      case 'get_conversations':
        if (customerId) {
          const qs = new URLSearchParams({ customer_id: customerId })
          if (shipperId) qs.set('shipper_id', shipperId)
          if (orderId) qs.set('order_id', orderId)
          if (label) qs.set('label', label)
          url = backendUrl(`/api/backend/v1/conversations?${qs.toString()}`)
        } else if (myShipperConversations === '1' || myShipperConversations === 'true') {
          url = backendUrl('/api/backend/v1/conversations?my_shipper_conversations=1')
        } else {
          url = backendUrl('/api/backend/v1/conversations')
        }
        break
      case 'get_messages':
        if (!conversationId) {
          return NextResponse.json({ 
            success: false, 
            message: 'Conversation ID required' 
          }, { status: 400 })
        }
        url = backendUrl(`/api/backend/v1/conversations/${conversationId}/messages`)
        break
      default:
        return NextResponse.json({ 
          success: false, 
          message: 'Invalid action' 
        }, { status: 400 })
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    const text = await response.text()
    const data = parseBackendJson(text)
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Messenger API GET error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Debug - POST request received')
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    console.log('🔍 Debug - Token:', token ? 'Present' : 'Missing')

    if (!token) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authorization token required' 
      }, { status: 401 })
    }

    // Check if this is a FormData request (file upload)
    const contentType = request.headers.get('content-type') || ''
    console.log('🔍 Debug - Content-Type:', contentType)
    
    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      console.log('🔍 Debug - Received FormData request')
      const formData = await request.formData()
      const media = formData.get('media') as File
      
      console.log('🔍 Debug - Media file:', media ? {
        name: media.name,
        size: media.size,
        type: media.type
      } : 'No media file')
      
      if (!media) {
        return NextResponse.json({ 
          success: false, 
          message: 'No media file provided' 
        }, { status: 400 })
      }

      // Create new FormData for backend
      const backendFormData = new FormData()
      backendFormData.append('media', media)

      const uploadUrl = backendUrl('/api/backend/v1/messages/upload-media')
      console.log('🔍 Debug - Backend upload URL:', uploadUrl)

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: backendFormData
      })
      
      console.log('🔍 Debug - Upload response status:', uploadResponse.status)
      const uploadData = await uploadResponse.json()
      console.log('🔍 Debug - Upload response data:', uploadData)
      
      if (!uploadResponse.ok) {
        console.log('🔍 Debug - Upload failed with status:', uploadResponse.status)
        console.log('🔍 Debug - Upload error response:', uploadData)
      }
      
      return NextResponse.json(uploadData, { status: uploadResponse.status })
    } else {
      // Handle JSON requests
      const body = await request.json()
      console.log('🔍 Debug - Request body:', body)
      const { action, ...data } = body
      console.log('🔍 Debug - Action:', action)
      console.log('🔍 Debug - Data:', data)
      
      let url = ''
      let requestBody = data

      switch (action) {
        case 'create_conversation':
          url = backendUrl('/api/backend/v1/conversations')
          requestBody = {
            ...data,
            ...(body.shipper_id != null ? { shipper_id: body.shipper_id } : {}),
            ...(body.order_id != null ? { order_id: body.order_id } : {}),
            ...(body.label ? { label: body.label } : {}),
          }
          break
        case 'send_message':
          url = backendUrl('/api/backend/v1/messages')
          break
        case 'recall_message':
        case 'delete_message': {
          const messageId = (data as { message_id?: number | string }).message_id
          if (messageId == null || messageId === '') {
            return NextResponse.json(
              { success: false, message: 'message_id required' },
              { status: 400 }
            )
          }
          const delUrl = backendUrl(`/api/backend/v1/messages/${messageId}`)
          const delRes = await fetch(delUrl, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          const delData = await delRes.json().catch(() => ({
            success: false,
            message: 'Invalid response from backend',
          }))
          return NextResponse.json(delData, { status: delRes.status })
        }
        default:
          console.log('🔍 Debug - Invalid action:', action)
          return NextResponse.json({ 
            success: false, 
            message: 'Invalid action' 
          }, { status: 400 })
      }

      console.log('🔍 Debug - Backend URL:', url)
      console.log('🔍 Debug - Request body to backend:', requestBody)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      console.log('🔍 Debug - Backend response status:', response.status)
      let responseData: unknown = null
      try {
        const text = await response.text()
        responseData = text ? parseBackendJson(text) : null
      } catch (parseError) {
        console.error('🔍 Debug - Backend response JSON parse failed:', parseError)
        return NextResponse.json(
          { success: false, message: 'Invalid response from backend' },
          { status: response.ok ? 502 : response.status }
        )
      }
      console.log('🔍 Debug - Backend response data:', responseData)
      return NextResponse.json(responseData, { status: response.status })
    }
  } catch (error) {
    console.error('Messenger API POST error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 })
  }
}
