import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Borrower clicks "I've paid" in the reminder email. Informational — the lender
// still needs to confirm via mark-received for the contract to settle.
// Accessible via magic-link token (borrowers typically don't have ShakeOnIt accounts).

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(req, params);
}
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(req, params, true);
}

async function handle(
  req: NextRequest,
  paramsP: Promise<{ id: string }>,
  isGet = false,
) {
  try {
    const { id } = await paramsP;
    const token = req.nextUrl.searchParams.get('token');

    const w = await prisma.waitlist.findUnique({ where: { id } });
    if (!w) return j(isGet, { error: 'not found' }, 404, '/?confirm=notfound');
    if (!token || !w.confirmToken || w.confirmToken !== token) {
      return j(isGet, { error: 'invalid token' }, 400, '/?confirm=invalid');
    }

    if (!w.markedPaidAt) {
      await prisma.waitlist.update({
        where: { id: w.id },
        data: { markedPaidAt: new Date() },
      });
    }

    return j(isGet, { ok: true }, 200, '/?confirm=paid-noted');
  } catch (e) {
    console.error('mark-paid failed', e);
    return j(isGet, { error: 'server error' }, 500, '/?confirm=error');
  }
}

function j(isGet: boolean, body: any, status: number, path: string) {
  if (!isGet) return NextResponse.json(body, { status });
  const url = new URL(path, process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
  return NextResponse.redirect(url);
}
