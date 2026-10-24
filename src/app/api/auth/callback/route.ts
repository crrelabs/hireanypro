import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, setSessionCookie } from '@/lib/session';

export async function GET(req: NextRequest) {
  const email = verifyToken(req.nextUrl.searchParams.get('t'), 'login');
  if (!email) {
    return NextResponse.redirect(new URL('/dashboard?login=expired', 'https://hireanypro.com'));
  }
  const res = NextResponse.redirect(new URL('/dashboard', 'https://hireanypro.com'));
  setSessionCookie(res, email);
  return res;
}
