import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { renderSignedContractHTML } from '@/lib/signed-contract';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const w = await prisma.waitlist.findUnique({ where: { id } });
  if (!w) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (w.userId !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!w.signedAt || !w.signatureHash) {
    return NextResponse.json({ error: 'not signed yet' }, { status: 400 });
  }

  const html = renderSignedContractHTML({
    draftText: w.draftText,
    signerName: w.signerNameOnAadhaar ?? w.creatorName,
    signerPhone: user.phone,
    counterpartyName: w.recipientName ?? undefined,
    signedAt: w.signedAt,
    signatureHash: w.signatureHash,
    contractId: w.id,
    isDemo: w.isDemoSigned,
  });

  return new NextResponse(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
