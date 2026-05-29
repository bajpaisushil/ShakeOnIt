import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { PAYMENT_MODE } from '@/lib/payments';
import ReactivateClient from './reactivate-client';

export const dynamic = 'force-dynamic';

export default async function SuspendedPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?to=/suspended');
  if (!user.suspendedAt) {
    return (
      <div className="max-w-md mx-auto px-6 py-12">
        <div className="card text-center">
          <div className="text-5xl mb-3">✅</div>
          <h1 className="text-2xl font-bold mb-2">Your account is active.</h1>
          <p className="text-sm text-muted mb-5">Nothing to reactivate — you're good.</p>
          <Link href="/my" className="btn inline-block">
            Back to my drafts
          </Link>
        </div>
      </div>
    );
  }

  const outstanding = (user.outstandingPaise / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });
  const suspendedDate = new Date(user.suspendedAt).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <div className="card border-danger/50">
        <div className="text-center mb-5">
          <div className="text-5xl mb-3">🚫</div>
          <h1 className="text-2xl font-bold mb-1">Account suspended</h1>
          <p className="text-sm text-muted">Suspended on {suspendedDate}</p>
        </div>

        <div className="bg-bg border border-line rounded-xl p-4 mb-5">
          <div className="text-xs uppercase tracking-wider text-muted mb-1">Reason</div>
          <div className="text-sm mb-3">{user.suspensionReason ?? '—'}</div>
          <div className="text-xs uppercase tracking-wider text-muted mb-1">Outstanding</div>
          <div className="text-2xl font-bold text-danger">{outstanding}</div>
        </div>

        <p className="text-sm text-muted mb-5 leading-relaxed">
          Settle the outstanding to lift the suspension. While suspended, you can still view your existing
          contracts but can't draft or sign new ones. Pinky promises are unaffected.
        </p>

        <ReactivateClient
          outstandingPaise={user.outstandingPaise}
          userName={user.name ?? ''}
          userPhone={user.phone}
          paymentMode={PAYMENT_MODE}
        />

        <div className="mt-6 text-center text-xs text-muted space-x-3">
          <Link href="/my" className="hover:text-accent">View my contracts</Link>
          <span>·</span>
          <form action="/api/auth/logout" method="post" className="inline">
            <button type="submit" className="hover:text-accent">Log out</button>
          </form>
        </div>
      </div>
    </div>
  );
}
