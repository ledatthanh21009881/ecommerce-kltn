import { NextRequest, NextResponse } from 'next/server';
import { backendUrl } from '@/app/api/backend/config';

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
    
    const url = backendUrl('/api/v1/auth/refresh');
    console.log('Proxying refresh token request to backend:', url);
    console.log('Request body:', body);
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    console.log('Backend refresh response status:', response.status);
    console.log('Backend refresh response data:', data);
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Refresh token proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
