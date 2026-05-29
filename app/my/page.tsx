import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { TEMPLATE_META } from '@/lib/contracts';
import { scoreBand } from '@/lib/score';
import { buildUpiLink, isValidVPA } from '@/lib/upi';
import MarkReceived from './mark-received';

export const dynamic = 'force-dynamic';

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtAmount(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });
}

function statusPill(w: {
  signedAt: Date | null;
  paidAt: Date | null;
  markedReceivedAt: Date | null;
  markedPaidAt: Date | null;
}) {
  if (w.markedReceivedAt) return { label: '✓ Settled', cls: 'pill pill-good' };
  if (w.markedPaidAt) return { label: 'Paid · awaiting your confirm', cls: 'pill' };
  if (w.signedAt) return { label: 'Signed · awaiting payment', cls: 'pill' };
  if (w.paidAt) return { label: 'Paid · awaiting sign', cls: 'pill' };
  return { label: 'Draft', cls: 'pill' };
}

function dueInfo(contractData: string): { dueDate: Date | null; daysOverdue: number; amountPaise: number | null } {
  try {
    const d = JSON.parse(contractData);
    const iso = d.dueDate;
    if (!iso) return { dueDate: null, daysOverdue: 0, amountPaise: null };
    const due = new Date(iso + 'T00:00:00');
    const days = Math.floor((Date.now() - due.getTime()) / (24 * 60 * 60 * 1000));
    const amt = d.amountPaise ?? d.totalPaise ?? d.compensationPaise ?? null;
    return { dueDate: due, daysOverdue: days, amountPaise: amt };
  } catch {
    return { dueDate: null, daysOverdue: 0, amountPaise: null };
  }
}

export default async function MyDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?to=/my');

  const drafts = await prisma.waitlist.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  const band = scoreBand(user.promiseScore);

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="text-center text-muted text-sm mb-6">Your drafts, settlements, and reputation</div>

      {user.suspendedAt && (
        <div className="card mb-6 border-danger/50">
          <div className="flex items-start gap-3">
            <div className="text-3xl">🚫</div>
            <div className="flex-1">
              <div className="font-bold text-danger mb-1">Account suspended</div>
              <div className="text-sm text-muted mb-2">
                {user.suspensionReason} · Outstanding: {fmtAmount(user.outstandingPaise)}
              </div>
              <Link href="/suspended" className="btn !w-auto !py-2 !px-4 text-sm inline-block">
                Pay outstanding to reactivate →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Profile + score */}
      <div className="card !p-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted mb-1">Logged in as</div>
            <div className="font-bold truncate">{user.name || 'Anonymous'}</div>
            <div className="text-xs text-muted">+91-{user.phone}</div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-muted mb-1">Promise score</div>
            <div className={`text-3xl font-bold ${band.cls}`}>
              {band.emoji} {user.promiseScore}
            </div>
            <div className={`text-xs ${band.cls}`}>{band.label}</div>
          </div>
        </div>
        <form action="/api/auth/logout" method="post" className="mt-3">
          <button type="submit" className="text-xs text-muted hover:text-accent">
            Log out
          </button>
        </form>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">My contracts</h1>
        {!user.suspendedAt && (
          <Link href="/pro" className="btn !w-auto !py-2 !px-4 text-sm">
            + New contract
          </Link>
        )}
      </div>

      {drafts.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📝</div>
          <h2 className="font-bold mb-1">No drafts yet</h2>
          <p className="text-sm text-muted mb-5">Draft a contract and it shows up here.</p>
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
            const due = dueInfo(d.contractData);
            const overdue = !d.markedReceivedAt && due.dueDate && due.daysOverdue > 0;
            const upiLink =
              d.upiVpa && isValidVPA(d.upiVpa) && due.amountPaise
                ? buildUpiLink({
                    pa: d.upiVpa,
                    pn: d.creatorName,
                    am: due.amountPaise / 100,
                    tn: `ShakeOnIt: ${d.id.slice(-6)}`,
                  })
                : null;

            return (
              <div key={d.id} className={`card !p-5 ${overdue ? 'border-danger/40' : ''}`}>
                <div className="flex items-start gap-3 mb-2">
                  <div className="text-2xl">{meta?.emoji ?? '📄'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold">{meta?.label ?? d.templateType}</div>
                    <div className="text-xs text-muted">
                      Drafted {fmtDate(d.createdAt)}
                      {d.recipientName && ` · with ${d.recipientName}`}
                    </div>
                    {due.dueDate && (
                      <div className={`text-xs mt-1 ${overdue ? 'text-danger font-semibold' : 'text-muted'}`}>
                        {overdue
                          ? `⚠️ ${due.daysOverdue} day${due.daysOverdue > 1 ? 's' : ''} overdue`
                          : `Due ${fmtDate(due.dueDate)}`}
                        {due.amountPaise ? ` · ${fmtAmount(due.amountPaise)}` : ''}
                      </div>
                    )}
                  </div>
                  <span className={pill.cls}>{pill.label}</span>
                </div>

                {d.markedReceivedAt && (
                  <div className="text-xs text-good mt-2">
                    ✓ Marked received on {fmtDate(d.markedReceivedAt)}
                  </div>
                )}
                {!d.markedReceivedAt && d.markedPaidAt && (
                  <div className="text-xs text-muted mt-2">
                    Borrower marked paid on {fmtDate(d.markedPaidAt)} — confirm below
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {!d.signedAt && !user.suspendedAt && (
                    <Link href={`/pro/esign/${d.id}`} className="btn !w-auto !py-2 !px-4 text-sm">
                      Continue to eSign →
                    </Link>
                  )}
                  {d.signedAt && (
                    <a
                      href={`/api/esign/download/${d.id}`}
                      target="_blank"
                      rel="noopener"
                      className="btn btn-secondary !w-auto !py-2 !px-4 text-sm"
                    >
                      📄 View signed
                    </a>
                  )}
                  {upiLink && !d.markedReceivedAt && (
                    <a
                      href={upiLink}
                      className="btn !w-auto !py-2 !px-4 text-sm !bg-good"
                      style={{ color: '#0f0e17' }}
                    >
                      💸 Pay via UPI
                    </a>
                  )}
                  {!d.markedReceivedAt && d.signedAt && <MarkReceived contractId={d.id} />}
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
