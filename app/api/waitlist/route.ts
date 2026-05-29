import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { isSuspended } from '@/lib/suspend';
import { isValidVPA } from '@/lib/upi';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      templateType,
      contractData,
      creatorName,
      creatorEmail,
      creatorPhone,
      recipientName,
      recipientPhone,
      draftText,
      upiVpa,
    } = body;

    if (!templateType || !contractData || !creatorEmail || !creatorPhone || !draftText) {
      return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
    }

    const user = await getCurrentUser().catch(() => null);
    if (user && isSuspended(user)) {
      return NextResponse.json(
        { error: 'account suspended', suspended: true },
        { status: 403 },
      );
    }

    const cleanVpa = typeof upiVpa === 'string' && isValidVPA(upiVpa.trim()) ? upiVpa.trim() : null;
    const confirmToken = randomBytes(16).toString('hex');

    const entry = await prisma.waitlist.create({
      data: {
        userId: user?.id ?? null,
        templateType: String(templateType),
        contractData: JSON.stringify(contractData),
        creatorName: String(creatorName ?? '').slice(0, 100),
        creatorEmail: String(creatorEmail).toLowerCase().slice(0, 200),
        creatorPhone: String(creatorPhone).slice(0, 20),
        recipientName: recipientName ? String(recipientName).slice(0, 100) : null,
        recipientPhone: recipientPhone ? String(recipientPhone).slice(0, 20) : null,
        draftText: String(draftText).slice(0, 10000),
        upiVpa: cleanVpa,
        confirmToken,
      },
    });

    // Also drop an anonymized record on the public wall
    try {
      const amount = contractData?.amountPaise ?? contractData?.totalPaise ?? contractData?.compensationPaise ?? null;
      const blurb =
        amount && amount > 0
          ? `Someone drafted a ${templateType} contract worth ₹${(amount / 100).toLocaleString('en-IN')}`
          : `Someone drafted a ${templateType} contract`;
      await prisma.publicPromise.create({
        data: {
          kind: 'pro-draft',
          templateType: String(templateType),
          blurb,
          amount: amount ?? null,
        },
      });
    } catch {
      // non-critical
    }

    const position = await prisma.waitlist.count();

    return NextResponse.json({ ok: true, id: entry.id, position });
  } catch (e) {
    console.error('waitlist POST failed', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
