import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { chargeMandate } from '@/lib/payments';
import { suspendUser } from '@/lib/suspend';

// Trigger a debit against a mandate. Used in two ways:
//   1. /api/cron/charge-due hits this for every due mandate (production)
//   2. The dashboard's "Simulate debit" button (demo) hits it with ?force=success|fail
//
// On failure, suspends the user account until they pay the outstanding via /suspended.

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const force = req.nextUrl.searchParams.get('force');

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const mandate = await prisma.mandate.findUnique({ where: { id }, include: { user: true } });
    if (!mandate) return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (mandate.userId !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    if (mandate.status === 'succeeded' || mandate.status === 'cancelled') {
      return NextResponse.json({ ok: false, alreadyResolved: mandate.status });
    }

    const result = await chargeMandate({
      mandateId: id,
      amountPaise: mandate.amountPaise,
      forceFail: force === 'fail',
    });

    const now = new Date();
    if (result.ok) {
      await prisma.mandate.update({
        where: { id },
        data: {
          status: 'succeeded',
          succeededAt: now,
          lastAttemptAt: now,
          attemptsCount: { increment: 1 },
          razorpayPaymentId: result.paymentId,
        },
      });
      return NextResponse.json({ ok: true, paymentId: result.paymentId });
    } else {
      await prisma.mandate.update({
        where: { id },
        data: {
          status: 'failed',
          failedAt: now,
          lastAttemptAt: now,
          attemptsCount: { increment: 1 },
          failureReason: result.reason ?? 'unknown',
        },
      });
      // Trigger suspension — outstanding = the debit amount that failed
      await suspendUser(
        mandate.userId,
        mandate.amountPaise,
        `Auto-debit failed: ${result.reason ?? 'unknown'}`,
      );
      return NextResponse.json({
        ok: false,
        suspended: true,
        reason: result.reason ?? 'unknown',
        outstandingPaise: mandate.amountPaise,
      });
    }
  } catch (e) {
    console.error('mandate/charge failed', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
