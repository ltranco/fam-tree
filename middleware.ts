import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, expectedSessionValue } from '@/lib/auth';

// The tree is publicly viewable — only mutating requests to /api/tree
// require the edit password. Reading the tree, and every other page/route,
// is untouched by this middleware.
export async function middleware(request: NextRequest) {
  if (request.method === 'GET') return NextResponse.next();

  const expected = await expectedSessionValue();
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (expected && cookie === expected) {
    return NextResponse.next();
  }
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export const config = {
  matcher: ['/api/tree'],
};
