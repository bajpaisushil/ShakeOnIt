import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, hashSig } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { waitlistId } = await req.json();
    if (!waitlistId) return NextResponse.json({ error: 'missing waitlistId' }, { status: 400 });

    const w = await prisma.waitlist.findUnique({ where: { id: waitlistId } });
    if (!w) return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (w.userId !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    if (w.signedAt) return NextResponse.json({ ok: true, alreadySigned: true });

    const now = new Date();
    const hash = hashSig(`${w.id}:${user.id}:${user.phone}:${now.toISOString()}:${w.draftText}`);

    await prisma.waitlist.update({
      where: { id: w.id },
      data: {
        signedAt: now,
        signatureHash: hash,
        signerNameOnAadhaar: user.name ?? w.creatorName,
        isDemoSigned: true,
      },
    });

    // Update the public wall — anonymized
    try {
      const amt =
        (JSON.parse(w.contractData)?.amountPaise as number | undefined) ??
        (JSON.parse(w.contractData)?.totalPaise as number | undefined) ??
        null;
      await prisma.publicPromise.create({
        data: {
          kind: 'pro-signed',
          templateType: w.templateType,
          blurb:
            amt && amt > 0
              ? `Someone eSigned a ${w.templateType} contract worth ₹${(amt / 100).toLocaleString('en-IN')}`
              : `Someone eSigned a ${w.templateType} contract`,
          amount: amt,
          agreedAt: now,
        },
      });
    } catch {}

    return NextResponse.json({ ok: true, signatureHash: hash });
  } catch (e) {
    console.error('esign/sign failed', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
