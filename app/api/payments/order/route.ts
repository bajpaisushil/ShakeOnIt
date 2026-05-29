import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createOrder, PRO_PRICE_PAISE } from '@/lib/payments';
import { isSuspended } from '@/lib/suspend';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (isSuspended(user)) {
      return NextResponse.json({ error: 'account suspended' }, { status: 403 });
    }

    const { waitlistId } = await req.json();
    const w = await prisma.waitlist.findUnique({ where: { id: waitlistId } });
    if (!w) return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (w.userId !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const order = await createOrder(PRO_PRICE_PAISE, `wl_${w.id.slice(-30)}`);

    await prisma.waitlist.update({
      where: { id: w.id },
      data: { razorpayOrderId: order.id, paidPaise: PRO_PRICE_PAISE },
    });

    return NextResponse.json(order);
  } catch (e) {
    console.error('payments/order failed', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
