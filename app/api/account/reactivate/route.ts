import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { reactivateUser } from '@/lib/suspend';
import { createOrder, verifySignature } from '@/lib/payments';

// Two endpoints in one — gated by `?step=`.
//   ?step=order  → create a payment order for the outstanding amount
//   ?step=verify → verify the payment + lift suspension

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (!user.suspendedAt) {
      return NextResponse.json({ error: 'not suspended' }, { status: 400 });
    }
    if (user.outstandingPaise <= 0) {
      await reactivateUser(user.id);
      return NextResponse.json({ ok: true, reactivated: true });
    }

    const step = req.nextUrl.searchParams.get('step') || 'order';

    if (step === 'order') {
      const order = await createOrder(user.outstandingPaise, `reactivate_${user.id.slice(-20)}`);
      return NextResponse.json(order);
    }

    if (step === 'verify') {
      const { orderId, paymentId, signature } = await req.json();
      if (!verifySignature(orderId, paymentId, signature)) {
        return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
      }
      await reactivateUser(user.id);
      return NextResponse.json({ ok: true, reactivated: true });
    }

    return NextResponse.json({ error: 'unknown step' }, { status: 400 });
  } catch (e) {
    console.error('account/reactivate failed', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
