import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    console.log('Inventory GET proxy')
    
    const authHeader = request.headers.get('Authorization')
    console.log('Authorization header:', authHeader)
    
    const response = await fetch(`${BACKEND_URL}/api/v1/inventory`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader || '',
      },
    })

    console.log('Backend GET response status:', response.status)

    if (!response.ok) {
      console.log('Backend GET failed with status:', response.status)
      const errorText = await response.text()
      console.log('Backend GET error response:', errorText)

      return NextResponse.json(
        { error: 'Backend request failed', status: response.status, details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('Backend GET response data:', data)

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
  } catch (error) {
    console.error('Inventory GET proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get authorization header from request
    const authHeader = request.headers.get('authorization');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const response = await fetch('http://localhost:8000/api/v1/inventory', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend inventory POST failed:', response.status, errorText);
      return NextResponse.json(
        { success: false, message: 'Backend request failed', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Create inventory proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
