import { NextRequest, NextResponse } from 'next/server';
import { getTree, setTree } from '@/lib/kv';
import { FamilyTreeData } from '@/lib/types';

export async function GET() {
  const data = await getTree();
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const data = (await request.json()) as FamilyTreeData;
  if (!data || typeof data !== 'object' || typeof data.people !== 'object' || !Array.isArray(data.partnerships)) {
    return NextResponse.json({ error: 'Invalid family tree data shape.' }, { status: 400 });
  }
  await setTree(data);
  return NextResponse.json({ ok: true });
}
