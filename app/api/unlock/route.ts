import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, expectedSessionValue, isCorrectPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  if (typeof password !== 'string' || !(await isCorrectPassword(password))) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  const sessionValue = await expectedSessionValue();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, sessionValue!, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
