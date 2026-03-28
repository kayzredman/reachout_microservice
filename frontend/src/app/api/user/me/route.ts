import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

const BACKEND_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    // Get full Clerk user details to pass to backend for user creation
    const user = await currentUser();
    const headers: Record<string, string> = { Authorization: authHeader };
    if (user) {
      headers['x-clerk-user-email'] = user.emailAddresses?.[0]?.emailAddress || '';
      headers['x-clerk-user-name'] = [user.firstName, user.lastName].filter(Boolean).join(' ') || '';
      headers['x-clerk-user-image'] = user.imageUrl || '';
    }
    const backendRes = await fetch(`${BACKEND_URL}/user/me`, { headers });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch {
    return NextResponse.json({ error: 'User service unavailable' }, { status: 503 });
  }
}

export async function PUT(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const backendRes = await fetch(`${BACKEND_URL}/user/me`, {
      method: 'PUT',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch {
    return NextResponse.json({ error: 'User service unavailable' }, { status: 503 });
  }
}
