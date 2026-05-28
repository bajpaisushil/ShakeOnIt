import Link from 'next/link';
import Header from '@/components/Header';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getStats() {
  try {
    const total = await prisma.publicPromise.count();
    const waitlist = await prisma.waitlist.count();
    return { total, waitlist };
  } catch {
    return { total: 0, waitlist: 0 };
  }
}

export default async function LandingPage() {
  const stats = await getStats();

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 pb-20">
      <Header />

      <div className="text-center mb-10">
        <h1 className="text-2xl md:text-3xl font-bold leading-tight">
          The friction-free way to <span className="text-accent">lock in a promise</span>.
        </h1>
        <p className="text-muted mt-3 text-base">
          Pinky-swear with a calendar reminder, or upgrade to a court-acceptable Aadhaar-eSigned contract.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/pinky" className="card hover:border-accent transition-colors group">
          <div className="text-4xl mb-3">💕</div>
          <h2 className="text-xl font-bold mb-1">Pinky Promise</h2>
          <div className="pill mb-3">Free · Instant · No signup</div>
          <ul className="text-sm text-muted space-y-1.5 mb-4">
            <li>✓ Type promise → get a link</li>
            <li>✓ WhatsApp it to them</li>
            <li>✓ Auto calendar reminder on both phones</li>
            <li>✓ One-tap UPI repay button</li>
            <li>✓ Zero accounts, zero database</li>
          </ul>
          <div className="text-xs text-muted/60 mb-4">
            Not legally binding — for friends, flatmates, family.
          </div>
          <div className="btn group-hover:bg-accent-soft text-center">
            Make a pinky promise →
          </div>
        </Link>

        <Link href="/pro" className="card hover:border-accent transition-colors group">
          <div className="text-4xl mb-3">⚖️</div>
          <h2 className="text-xl font-bold mb-1">Official Contract</h2>
          <div className="pill pill-good mb-3">Court-acceptable · Coming soon</div>
          <ul className="text-sm text-muted space-y-1.5 mb-4">
            <li>✓ Aadhaar-eSigned (UIDAI verified)</li>
            <li>✓ Tamper-proof audit trail</li>
            <li>✓ Legal under IT Act § 5</li>
            <li>✓ Pre-built templates (loan, expense, service)</li>
            <li>✓ Optional UPI auto-debit on due date</li>
          </ul>
          <div className="text-xs text-muted/60 mb-4">
            Draft now, sign when eSign goes live.
          </div>
          <div className="btn btn-secondary group-hover:border-accent text-center">
            Draft a contract →
          </div>
        </Link>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-4">
        <Link href="/wall" className="card !p-5 hover:border-accent transition-colors">
          <div className="text-xs uppercase tracking-wider text-muted mb-1">Promise Wall</div>
          <div className="text-2xl font-bold">
            {stats.total.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-muted">shakes on the public wall</div>
        </Link>
        <div className="card !p-5">
          <div className="text-xs uppercase tracking-wider text-muted mb-1">eSign Waitlist</div>
          <div className="text-2xl font-bold">
            {stats.waitlist.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-muted">contracts drafted, awaiting Aadhaar launch</div>
        </div>
      </div>

      <footer className="text-center text-xs text-muted mt-12">
        No accounts. No database for pinky promises. Your promise lives in the link itself.
      </footer>
    </div>
  );
}
