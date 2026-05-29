import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { clearSessionCookie } from '@/lib/auth';

export async function POST() {
  try {
    const jar = await cookies();
    const token = jar.get('shake_session')?.value;
    if (token) {
      await prisma.session.deleteMany({ where: { token } });
    }
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
