import { NextRequest, NextResponse } from 'next/server'

const BACKEND_BASE_URL = 'http://localhost:8000/api/backend/v1'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const conversationId = searchParams.get('conversation_id')
    const customerId = searchParams.get('customer_id')
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
        url = customerId 
          ? `${BACKEND_BASE_URL}/conversations?customer_id=${customerId}`
          : `${BACKEND_BASE_URL}/conversations`
        break
      case 'get_messages':
        if (!conversationId) {
          return NextResponse.json({ 
            success: false, 
            message: 'Conversation ID required' 
          }, { status: 400 })
        }
        url = `${BACKEND_BASE_URL}/conversations/${conversationId}/messages`
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

    const data = await response.json()
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
      
      console.log('🔍 Debug - Backend upload URL:', `${BACKEND_BASE_URL}/messages/upload-media`)
      
      const uploadResponse = await fetch(`${BACKEND_BASE_URL}/messages/upload-media`, {
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
          url = `${BACKEND_BASE_URL}/conversations`
          break
        case 'send_message':
          url = `${BACKEND_BASE_URL}/messages`
          break
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
      const responseData = await response.json()
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
