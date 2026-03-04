import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ success: true }, { status: 200 });

  response.cookies.set('campaignsites_session', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  response.cookies.set('userRole', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  return response;
}
