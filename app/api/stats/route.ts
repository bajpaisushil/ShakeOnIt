import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const [pinky, pro, agreed] = await Promise.all([
      prisma.publicPromise.count({ where: { kind: 'pinky' } }),
      prisma.publicPromise.count({ where: { kind: 'pro-draft' } }),
      prisma.publicPromise.count({ where: { agreedAt: { not: null } } }),
    ]);
    return NextResponse.json({ pinky, pro, agreed, total: pinky + pro });
  } catch (e) {
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
