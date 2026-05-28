import Link from 'next/link';
import Header from '@/components/Header';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getWallData() {
  try {
    const [recent, total, agreed, totalAmt] = await Promise.all([
      prisma.publicPromise.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.publicPromise.count(),
      prisma.publicPromise.count({ where: { agreedAt: { not: null } } }),
      prisma.publicPromise.aggregate({ _sum: { amount: true } }),
    ]);
    return {
      recent,
      total,
      agreed,
      totalRupees: Math.round((totalAmt._sum.amount ?? 0) / 100),
    };
  } catch {
    return { recent: [], total: 0, agreed: 0, totalRupees: 0 };
  }
}

function timeAgo(d: Date): string {
  const sec = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export default async function WallPage() {
  const { recent, total, agreed, totalRupees } = await getWallData();

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <Header subtitle="Public Promise Wall · anonymized" />

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="card !p-4 text-center">
          <div className="text-2xl font-bold">{total.toLocaleString('en-IN')}</div>
          <div className="text-xs text-muted">total shakes</div>
        </div>
        <div className="card !p-4 text-center">
          <div className="text-2xl font-bold text-good">{agreed.toLocaleString('en-IN')}</div>
          <div className="text-xs text-muted">agreed</div>
        </div>
        <div className="card !p-4 text-center">
          <div className="text-2xl font-bold text-accent">
            ₹{totalRupees.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-muted">value pledged</div>
        </div>
      </div>

      <div className="card">
        <h1 className="text-lg font-bold mb-1">Recent shakes</h1>
        <p className="text-xs text-muted mb-4">
          Anonymized — no names, no contacts. Just the vibe.
        </p>

        {recent.length === 0 && (
          <div className="text-center py-8 text-muted text-sm">
            No promises on the wall yet. Make the first one →{' '}
            <Link href="/pinky" className="text-accent">
              Pinky Promise
            </Link>
          </div>
        )}

        <div className="divide-y divide-line">
          {recent.map((p) => (
            <div key={p.id} className="py-3 flex justify-between items-start gap-3">
              <div className="flex-1">
                <div className="text-sm">{p.blurb}</div>
                <div className="text-xs text-muted mt-0.5">
                  {p.kind === 'pro-draft' ? '⚖️ Pro draft' : '💕 Pinky'}
                  {p.agreedAt && ' · ✓ agreed'}
                </div>
              </div>
              <div className="text-xs text-muted whitespace-nowrap">{timeAgo(p.createdAt)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link href="/" className="text-sm text-muted hover:text-accent">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
