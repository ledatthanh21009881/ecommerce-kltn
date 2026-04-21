import { NextRequest, NextResponse } from 'next/server';
import { backendUrl } from '@/app/api/backend/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(backendUrl('/api/v1/auth/reset-password'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Reset password proxy error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

