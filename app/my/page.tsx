import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { TEMPLATE_META } from '@/lib/contracts';

export const dynamic = 'force-dynamic';

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statusPill(w: { signedAt: Date | null; paidAt: Date | null }): { label: string; cls: string } {
  if (w.signedAt) return { label: '✓ Signed', cls: 'pill pill-good' };
  if (w.paidAt) return { label: 'Paid · awaiting sign', cls: 'pill' };
  return { label: 'Draft', cls: 'pill' };
}

export default async function MyDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?to=/my');

  const drafts = await prisma.waitlist.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="text-center text-muted text-sm mb-6">Your drafts and signed contracts</div>

      <div className="card !p-5 mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted mb-1">Logged in as</div>
          <div className="font-bold">{user.name || 'Anonymous'}</div>
          <div className="text-xs text-muted">+91-{user.phone}</div>
        </div>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="btn btn-secondary !w-auto !py-2 !px-4 text-sm">
            Log out
          </button>
        </form>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">My contracts</h1>
        <Link href="/pro" className="btn !w-auto !py-2 !px-4 text-sm">
          + New contract
        </Link>
      </div>

      {drafts.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📝</div>
          <h2 className="font-bold mb-1">No drafts yet</h2>
          <p className="text-sm text-muted mb-5">
            Draft a contract and it shows up here.
          </p>
          <Link href="/pro" className="btn inline-block !w-auto">
            Draft your first contract →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map((d) => {
            const tplKey = d.templateType as keyof typeof TEMPLATE_META;
            const meta = TEMPLATE_META[tplKey];
            const pill = statusPill(d);
            return (
              <div key={d.id} className="card !p-5">
                <div className="flex items-start gap-3 mb-2">
                  <div className="text-2xl">{meta?.emoji ?? '📄'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold">{meta?.label ?? d.templateType}</div>
                    <div className="text-xs text-muted">
                      Drafted {formatDate(d.createdAt)}
                      {d.recipientName && ` · with ${d.recipientName}`}
                    </div>
                  </div>
                  <span className={pill.cls}>{pill.label}</span>
                </div>

                <div className="flex gap-2 mt-3">
                  {!d.signedAt ? (
                    <Link href={`/pro/esign/${d.id}`} className="btn !w-auto !py-2 !px-4 text-sm">
                      Continue to eSign →
                    </Link>
                  ) : (
                    <a
                      href={`/api/esign/download/${d.id}`}
                      target="_blank"
                      rel="noopener"
                      className="btn !w-auto !py-2 !px-4 text-sm"
                    >
                      📄 View signed
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-muted hover:text-accent">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
