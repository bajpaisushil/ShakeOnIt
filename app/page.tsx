import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getLang } from '@/lib/lang-server';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

async function getStats() {
  try {
    const [total, waitlist] = await Promise.all([
      prisma.publicPromise.count(),
      prisma.waitlist.count(),
    ]);
    return { total, waitlist };
  } catch {
    return { total: 0, waitlist: 0 };
  }
}

export default async function LandingPage() {
  const [stats, lang] = await Promise.all([getStats(), getLang()]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-6 pb-20">
      <div className="text-center text-muted text-sm mb-8">{t(lang, 'tagline')}</div>
      <div className="text-center mb-10">
        <h1 className="text-2xl md:text-3xl font-bold leading-tight">
          {t(lang, 'hero1')} <span className="text-accent">{t(lang, 'heroAccent')}</span>.
        </h1>
        <p className="text-muted mt-3 text-base">{t(lang, 'heroSub')}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/pinky" className="card hover:border-accent transition-colors group">
          <div className="text-4xl mb-3">💕</div>
          <h2 className="text-xl font-bold mb-1">{t(lang, 'pinkyTitle')}</h2>
          <div className="pill mb-3">{t(lang, 'pinkyPill')}</div>
          <ul className="text-sm text-muted space-y-1.5 mb-4">
            <li>{t(lang, 'pinkyB1')}</li>
            <li>{t(lang, 'pinkyB2')}</li>
            <li>{t(lang, 'pinkyB3')}</li>
            <li>{t(lang, 'pinkyB4')}</li>
            <li>{t(lang, 'pinkyB5')}</li>
          </ul>
          <div className="text-xs text-muted/60 mb-4">{t(lang, 'pinkyFoot')}</div>
          <div className="btn group-hover:bg-accent-soft text-center">{t(lang, 'pinkyCta')}</div>
        </Link>

        <Link href="/pro" className="card hover:border-accent transition-colors group">
          <div className="text-4xl mb-3">⚖️</div>
          <h2 className="text-xl font-bold mb-1">{t(lang, 'proTitle')}</h2>
          <div className="pill pill-good mb-3">{t(lang, 'proPill')}</div>
          <ul className="text-sm text-muted space-y-1.5 mb-4">
            <li>{t(lang, 'proB1')}</li>
            <li>{t(lang, 'proB2')}</li>
            <li>{t(lang, 'proB3')}</li>
            <li>{t(lang, 'proB4')}</li>
            <li>{t(lang, 'proB5')}</li>
          </ul>
          <div className="text-xs text-muted/60 mb-4">{t(lang, 'proFoot')}</div>
          <div className="btn btn-secondary group-hover:border-accent text-center">{t(lang, 'proCta')}</div>
        </Link>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-4">
        <Link href="/wall" className="card !p-5 hover:border-accent transition-colors">
          <div className="text-xs uppercase tracking-wider text-muted mb-1">{t(lang, 'wallLabel')}</div>
          <div className="text-2xl font-bold">{stats.total.toLocaleString('en-IN')}</div>
          <div className="text-xs text-muted">{t(lang, 'wallSub')}</div>
        </Link>
        <div className="card !p-5">
          <div className="text-xs uppercase tracking-wider text-muted mb-1">{t(lang, 'waitlistLabel')}</div>
          <div className="text-2xl font-bold">{stats.waitlist.toLocaleString('en-IN')}</div>
          <div className="text-xs text-muted">{t(lang, 'waitlistSub')}</div>
        </div>
      </div>

      <footer className="text-center text-xs text-muted mt-12">{t(lang, 'footer')}</footer>
    </div>
  );
}
