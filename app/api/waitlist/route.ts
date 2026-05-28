import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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
    } = body;

    if (!templateType || !contractData || !creatorEmail || !creatorPhone || !draftText) {
      return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
    }

    const entry = await prisma.waitlist.create({
      data: {
        templateType: String(templateType),
        contractData: JSON.stringify(contractData),
        creatorName: String(creatorName ?? '').slice(0, 100),
        creatorEmail: String(creatorEmail).toLowerCase().slice(0, 200),
        creatorPhone: String(creatorPhone).slice(0, 20),
        recipientName: recipientName ? String(recipientName).slice(0, 100) : null,
        recipientPhone: recipientPhone ? String(recipientPhone).slice(0, 20) : null,
        draftText: String(draftText).slice(0, 10000),
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
