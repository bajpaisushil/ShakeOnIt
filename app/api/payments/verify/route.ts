import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { verifySignature } from '@/lib/payments';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { waitlistId, orderId, paymentId, signature } = await req.json();
    if (!waitlistId || !orderId || !paymentId || !signature) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    }

    const w = await prisma.waitlist.findUnique({ where: { id: waitlistId } });
    if (!w) return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (w.userId !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    if (w.razorpayOrderId !== orderId) {
      return NextResponse.json({ error: 'order mismatch' }, { status: 400 });
    }

    if (!verifySignature(orderId, paymentId, signature)) {
      return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
    }

    await prisma.waitlist.update({
      where: { id: w.id },
      data: { razorpayPaymentId: paymentId, paidAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('payments/verify failed', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
