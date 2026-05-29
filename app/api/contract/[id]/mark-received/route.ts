import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Lender confirms the payment was received. Source of truth for settlement.
//   - If called with a session, checks ownership.
//   - If called with ?token=xxx (from a reminder-email link), validates the token.
// On settlement, also clears any pending overdue-wall scheduling for this contract.

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handle(req, params);
}
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Allow GET via email link (for one-tap confirm from a phone)
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
    if (!w) return notFoundOrRedirect(isGet);

    // Authorize: session-owner OR matching token
    if (token) {
      if (!w.confirmToken || w.confirmToken !== token) {
        return jsonOrRedirect(isGet, { error: 'invalid token' }, 400, '/?confirm=invalid');
      }
    } else {
      const user = await getCurrentUser();
      if (!user) return jsonOrRedirect(isGet, { error: 'unauthorized' }, 401, '/login');
      if (w.userId !== user.id) {
        return jsonOrRedirect(isGet, { error: 'forbidden' }, 403, '/my');
      }
    }

    if (w.markedReceivedAt) {
      return jsonOrRedirect(isGet, { ok: true, alreadyMarked: true }, 200, '/my?confirm=already');
    }

    await prisma.waitlist.update({
      where: { id: w.id },
      data: { markedReceivedAt: new Date() },
    });

    return jsonOrRedirect(isGet, { ok: true }, 200, '/my?confirm=received');
  } catch (e) {
    console.error('mark-received failed', e);
    return jsonOrRedirect(isGet, { error: 'server error' }, 500, '/?confirm=error');
  }
}

function notFoundOrRedirect(isGet: boolean) {
  return isGet
    ? NextResponse.redirect(new URL('/?confirm=notfound', 'http://x').origin + '/?confirm=notfound')
    : NextResponse.json({ error: 'not found' }, { status: 404 });
}
function jsonOrRedirect(isGet: boolean, body: any, status: number, redirectPath: string) {
  if (!isGet) return NextResponse.json(body, { status });
  // For GET (email click), redirect to a friendly page
  const url = new URL(redirectPath, process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
  return NextResponse.redirect(url);
}
