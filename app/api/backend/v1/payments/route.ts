import { NextRequest, NextResponse } from 'next/server'
import { backendUrl } from '@/app/api/backend/config'

/** Frontend expects each payment: payment_id, order_id, customer_name, amount, payment_method, status, transaction_id, created_at, processed_at?, gateway_response? */
function normalizePayment(row: Record<string, unknown>): Record<string, unknown> {
  return {
    payment_id: Number(row.payment_id ?? 0),
    order_id: Number(row.order_id ?? 0),
    customer_name: String(row.customer_name ?? row.customerName ?? ''),
    amount: Number(row.amount ?? row.paid_amount ?? 0),
    payment_method: String(row.payment_method ?? row.method ?? 'unknown'),
    status: String(row.status ?? 'pending'),
    transaction_id: row.transaction_id != null ? String(row.transaction_id) : undefined,
    created_at: row.created_at != null ? String(row.created_at) : '',
    processed_at: row.processed_at != null || row.confirmed_at != null
      ? String(row.processed_at ?? row.confirmed_at ?? '')
      : undefined,
    gateway_response: row.gateway_response != null ? String(row.gateway_response) : undefined,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()
    const url = `${backendUrl('/api/v1/payments')}${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
    })

    const responseText = await response.text()
    const contentType = response.headers.get('content-type') || ''

    let jsonText = responseText
    if (responseText.includes('<br />') || responseText.includes('<b>') || responseText.includes('Warning')) {
      const jsonMatch = responseText.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
      if (jsonMatch) jsonText = jsonMatch[0]
    }

    let data: { success?: boolean; data?: unknown; message?: string }
    try {
      if (contentType.includes('application/json') || jsonText.trim().startsWith('{') || jsonText.trim().startsWith('[')) {
        data = JSON.parse(jsonText) as { success?: boolean; data?: unknown; message?: string }
      } else {
        return NextResponse.json(
          { success: false, message: 'Backend returned invalid response.', error: 'Invalid content-type' },
          { status: 500 }
        )
      }
    } catch {
      return NextResponse.json(
        { success: false, message: 'Backend returned invalid response.', error: 'Failed to parse JSON' },
        { status: 500 }
      )
    }

    if (!data.success || data.data === undefined) {
      return NextResponse.json(data, { status: response.status })
    }

    const rawItems = Array.isArray(data.data) ? data.data : (data.data as Record<string, unknown>)?.items
    const items = Array.isArray(rawItems)
      ? rawItems.map((row: Record<string, unknown>) => normalizePayment(row))
      : []

    return NextResponse.json(
      { ...data, data: items },
      { status: response.status }
    )
  } catch (error) {
    console.error('Payments proxy error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
