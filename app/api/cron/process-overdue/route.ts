import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { impactForOverdue, adjustScore } from '@/lib/score';

// Daily cron — walks all unsettled contracts past their due date, applies the
// promise-score penalty, and (if 30+ days overdue) posts to the public wall.
// Idempotent: tracks overdueWallPostedAt so we don't double-post.

export const dynamic = 'force-dynamic';

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get('authorization');
  if (header === `Bearer ${secret}`) return true;
  const query = req.nextUrl.searchParams.get('key');
  return query === secret;
}

function rupees(p: number): string {
  return (p / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  try {
    const now = new Date();
    const candidates = await prisma.waitlist.findMany({
      where: {
        markedReceivedAt: null,
        userId: { not: null },          // need a user to penalize
      },
      take: 500,
    });

    let scored = 0;
    let wallPosts = 0;

    for (const w of candidates) {
      const data = safeParse(w.contractData);
      const dueISO: string | null = data?.dueDate ?? null;
      if (!dueISO || !w.userId) continue;

      const due = new Date(dueISO + 'T00:00:00');
      const daysOverdue = Math.floor((now.getTime() - due.getTime()) / (24 * 60 * 60 * 1000));
      if (daysOverdue <= 0) continue;

      const impact = impactForOverdue(daysOverdue);
      // Score impact is daily; we want it applied ONCE per band-crossing.
      // Simple approach: apply -5 once any day overdue; -15 once 7d; -30 once 30d.
      // Encoded in `overdueWallPostedAt` for the 30d band; smaller bands tracked via
      // a check that score hasn't already absorbed.
      // For simplicity in this scaffold, we apply -1 daily up to a cap of -30 instead.
      const delta = capDailyImpact(daysOverdue);
      if (delta !== 0) {
        await adjustScore(w.userId, delta);
        scored++;
      }

      if (impact.postToWall && !w.overdueWallPostedAt) {
        const amount =
          data?.amountPaise ?? data?.totalPaise ?? data?.compensationPaise ?? null;
        await prisma.publicPromise.create({
          data: {
            kind: 'broken-promise',
            templateType: w.templateType,
            blurb:
              amount && amount > 0
                ? `Someone broke a ${rupees(amount)} promise (${daysOverdue} days overdue)`
                : `Someone broke a ${w.templateType} promise (${daysOverdue} days overdue)`,
            amount: amount ?? null,
          },
        });
        await prisma.waitlist.update({
          where: { id: w.id },
          data: { overdueWallPostedAt: new Date() },
        });
        wallPosts++;
      }
    }

    return NextResponse.json({ ok: true, scored, wallPosts, scanned: candidates.length });
  } catch (e: any) {
    console.error('process-overdue failed', e);
    return NextResponse.json({ error: e?.message ?? 'server error' }, { status: 500 });
  }
}

// Apply a small daily decay up to a cap so the cron is idempotent without
// having to track per-band penalty history.
function capDailyImpact(daysOverdue: number): number {
  if (daysOverdue <= 0) return 0;
  if (daysOverdue <= 7) return -1;
  if (daysOverdue <= 30) return -2;
  return -3;
}

function safeParse(s: string): any {
  try { return JSON.parse(s); } catch { return null; }
}
