import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail, reminderEmail } from '@/lib/email';
import { buildUpiLink, isValidVPA } from '@/lib/upi';

// Daily cron — sends reminder emails for contracts due in the next 24h that haven't been settled.
// Hits BOTH lender (creator) and borrower (recipient) addresses if both are known.
//
// Protected by CRON_SECRET — Vercel Cron adds it automatically. For manual testing,
// hit `?key=$CRON_SECRET` or set the bearer header.

export const dynamic = 'force-dynamic';

function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret set → allow (dev mode)
  const header = req.headers.get('authorization');
  if (header === `Bearer ${secret}`) return true;
  const query = req.nextUrl.searchParams.get('key');
  if (query === secret) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin || 'http://localhost:3000';

    // Find unsigned-then-settled contracts due in next 24h that we haven't reminded yet.
    // Due date is in contractData (varies by template) — load all due-soon and filter in JS.
    const candidates = await prisma.waitlist.findMany({
      where: {
        markedReceivedAt: null,
        reminderSentAt: null,
        createdAt: { lt: now },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,                    // safety cap
    });

    let sent = 0;
    let skipped = 0;

    for (const w of candidates) {
      const data = safeParseContract(w.contractData);
      const dueISO: string | null = data?.dueDate ?? null;
      const amountPaise: number | undefined =
        data?.amountPaise ?? data?.totalPaise ?? data?.compensationPaise ?? undefined;
      if (!dueISO) {
        skipped++;
        continue;
      }
      const due = new Date(dueISO + 'T00:00:00');
      if (due > in24h || due < new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)) {
        skipped++; // not in window OR too old (>30d ago)
        continue;
      }

      const upiLink =
        w.upiVpa && isValidVPA(w.upiVpa)
          ? buildUpiLink({
              pa: w.upiVpa,
              pn: w.creatorName,
              am: amountPaise ? amountPaise / 100 : undefined,
              tn: `ShakeOnIt: ${w.id.slice(-6)}`,
            })
          : undefined;

      const markReceivedUrl = w.confirmToken
        ? `${baseUrl}/api/contract/${w.id}/mark-received?token=${w.confirmToken}`
        : undefined;
      const iPaidUrl = w.confirmToken
        ? `${baseUrl}/api/contract/${w.id}/mark-paid?token=${w.confirmToken}`
        : undefined;

      const summary = w.draftText.split('\n').find((l) => l.trim().length > 20) || w.templateType;

      // Lender email
      if (w.creatorEmail) {
        const { subject, html } = reminderEmail({
          recipientName: w.creatorName,
          fromName: w.recipientName ?? 'the other party',
          contractSummary: summary,
          amountPaise,
          dueDateISO: dueISO,
          markReceivedUrl,
          isLender: true,
          baseUrl,
        });
        const r = await sendEmail({ to: w.creatorEmail, subject, html });
        if (r.ok) sent++;
      }

      // Borrower email (if we have it)
      if (w.recipientPhone) {
        // We don't capture recipient email in the form yet; the borrower email path
        // activates once that's added. Skipping for now — borrower can still see the
        // contract via the shared link.
      }

      await prisma.waitlist.update({
        where: { id: w.id },
        data: { reminderSentAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true, sent, skipped, scanned: candidates.length });
  } catch (e: any) {
    console.error('send-reminders failed', e);
    return NextResponse.json({ error: e?.message ?? 'server error' }, { status: 500 });
  }
}

function safeParseContract(s: string): any {
  try { return JSON.parse(s); } catch { return null; }
}
