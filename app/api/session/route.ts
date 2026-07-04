import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, expectedSessionValue } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const expected = await expectedSessionValue();
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  const canEdit = Boolean(expected) && cookie === expected;
  return NextResponse.json({ canEdit });
}
