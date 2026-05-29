import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { isSuspended } from '@/lib/suspend';
import { createMandate } from '@/lib/payments';

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
    if (!w.autoDebitEnabled) {
      return NextResponse.json({ error: 'auto-debit not enabled on this draft' }, { status: 400 });
    }

    // Idempotency — return the existing mandate if one was already set up
    const existing = await prisma.mandate.findUnique({ where: { waitlistId: w.id } });
    if (existing) return NextResponse.json({ mandateId: existing.id, status: existing.status });

    // Derive scheduled debit date from the contract data
    const data = JSON.parse(w.contractData);
    const dueDate = new Date((data.dueDate || data.d) + 'T09:00:00+05:30');
    const amount = w.autoDebitAmountPaise || data.amountPaise || data.totalPaise || data.compensationPaise || 0;
    if (amount <= 0) {
      return NextResponse.json({ error: 'no amount to debit' }, { status: 400 });
    }

    const auth = await createMandate({
      userId: user.id,
      phone: user.phone,
      amountPaise: amount,
      scheduledFor: dueDate,
      description: `ShakeOnIt: ${w.templateType} contract ${w.id.slice(-6)}`,
    });

    const mandate = await prisma.mandate.create({
      data: {
        userId: user.id,
        waitlistId: w.id,
        status: auth.status,
        amountPaise: amount,
        scheduledFor: dueDate,
      },
    });

    return NextResponse.json({
      mandateId: mandate.id,
      status: mandate.status,
      authUrl: auth.authUrl ?? null,
      simulated: auth.simulated ?? false,
      scheduledFor: mandate.scheduledFor.toISOString(),
    });
  } catch (e) {
    console.error('mandate/create failed', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
