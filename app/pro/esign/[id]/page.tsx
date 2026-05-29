import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { TEMPLATE_META } from '@/lib/contracts';
import { PRO_PRICE_PAISE, RAZORPAY_MODE } from '@/lib/razorpay';
import EsignClient from './esign-client';

export const dynamic = 'force-dynamic';

export default async function EsignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?to=/pro/esign/${id}`);

  const waitlist = await prisma.waitlist.findUnique({ where: { id } });
  if (!waitlist) notFound();

  // Tie the draft to the logged-in user if it's not yet owned.
  if (!waitlist.userId) {
    await prisma.waitlist.update({ where: { id }, data: { userId: user.id } });
  } else if (waitlist.userId !== user.id) {
    return (
      <div className="max-w-md mx-auto px-6 py-12">
        <div className="card text-center">
          <h1 className="text-xl font-bold mb-2">Not your draft</h1>
          <p className="text-sm text-muted mb-5">
            This draft belongs to another account. Each contract is private to its creator.
          </p>
          <Link href="/my" className="btn inline-block">
            Back to my drafts
          </Link>
        </div>
      </div>
    );
  }

  const tplKey = waitlist.templateType as keyof typeof TEMPLATE_META;
  const meta = TEMPLATE_META[tplKey];

  if (waitlist.signedAt) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="text-center text-muted text-sm mb-6">Already signed</div>
        <section className="card text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold mb-2">This contract is signed.</h1>
          <p className="text-muted mb-5">
            Signed on{' '}
            {new Date(waitlist.signedAt).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          <a
            href={`/api/esign/download/${waitlist.id}`}
            target="_blank"
            rel="noopener"
            className="btn inline-block !w-auto"
          >
            📄 View signed contract
          </a>
          <div className="mt-4">
            <Link href="/my" className="text-sm text-muted hover:text-accent">
              ← My drafts
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <div className="text-center text-muted text-sm mb-6">{meta?.label ?? waitlist.templateType}</div>
      <EsignClient
        id={waitlist.id}
        draftText={waitlist.draftText}
        templateLabel={meta?.label ?? waitlist.templateType}
        creatorName={waitlist.creatorName}
        creatorPhone={user.phone}
        pricePaise={PRO_PRICE_PAISE}
        razorpayMode={RAZORPAY_MODE}
        razorpayKeyId={process.env.RAZORPAY_KEY_ID || ''}
        alreadyPaid={Boolean(waitlist.paidAt)}
      />
    </div>
  );
}
