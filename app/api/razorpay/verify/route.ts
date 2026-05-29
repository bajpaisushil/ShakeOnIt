import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { verifyPaymentSignature } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const {
      waitlistId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await req.json();

    if (!waitlistId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    }

    const w = await prisma.waitlist.findUnique({ where: { id: waitlistId } });
    if (!w) return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (w.userId !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    if (w.razorpayOrderId !== razorpay_order_id) {
      return NextResponse.json({ error: 'order mismatch' }, { status: 400 });
    }

    const ok = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!ok) return NextResponse.json({ error: 'invalid signature' }, { status: 400 });

    await prisma.waitlist.update({
      where: { id: w.id },
      data: {
        razorpayPaymentId: razorpay_payment_id,
        paidAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('razorpay/verify failed', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
