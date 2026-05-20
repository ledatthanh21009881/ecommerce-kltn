import { getBackendBaseUrl } from '@/app/api/backend/config'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('order_id')
    const format = searchParams.get('format') || 'pdf'
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'Order ID is required' },
        { status: 400 }
      )
    }
    
    const response = await fetch(`${getBackendBaseUrl()}/api/v1/invoice/generate?order_id=${orderId}&format=${format}`, {
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
    })

    if (format === 'pdf') {
      const blob = await response.blob()
      return new NextResponse(blob, {
        status: response.status,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice-${orderId}.pdf"`,
        },
      })
    } else {
      const data = await response.json()
      return NextResponse.json(data, { status: response.status })
    }
  } catch (error) {
    console.error('Error generating invoice:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to generate invoice' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('order_id')
    const format = searchParams.get('format') || 'email'
    const body = await request.json()
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'Order ID is required' },
        { status: 400 }
      )
    }
    
    const response = await fetch(`${getBackendBaseUrl()}/api/v1/invoice/generate?order_id=${orderId}&format=${format}`, {
      method: 'POST',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error generating invoice:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to generate invoice' },
      { status: 500 }
    )
  }
}
