import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db/config';
import { decrypt } from '@/lib/security/encryption';
import { testConnection } from '@/lib/db/connection-manager';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { clientType, connectionConfig } = body;

    if (!clientType || !connectionConfig) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Missing connection details' } },
        { status: 400 }
      );
    }

    // Test the connection
    const result = await testConnection(clientType as any, connectionConfig);

    return NextResponse.json({
      success: true,
      data: {
        connected: result.success,
        message: result.success ? 'Connection successful' : result.message,
        latency: result.latency,
      },
    });
  } catch (error) {
    console.error('Error testing connection:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to test connection' },
      },
      { status: 500 }
    );
  }
}
