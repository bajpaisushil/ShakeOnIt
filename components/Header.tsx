import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getLang } from '@/lib/lang-server';
import { t } from '@/lib/i18n';
import LangToggle from './LangToggle';

export default async function Header() {
  const [user, lang] = await Promise.all([getCurrentUser().catch(() => null), getLang()]);

  return (
    <header className="max-w-2xl mx-auto px-6 pt-6 pb-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-block">
          <div className="text-2xl font-extrabold tracking-tight">
            <span className="inline-block -rotate-12">🤝</span> ShakeOnIt
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <LangToggle initialLang={lang} />
          {user ? (
            <Link
              href="/my"
              className="text-xs bg-card border border-line hover:border-accent rounded-full px-3 py-1.5 font-medium"
            >
              {t(lang, 'myDrafts')} · {user.name?.split(' ')[0] || user.phone.slice(-4)}
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-xs bg-card border border-line hover:border-accent rounded-full px-3 py-1.5 font-medium"
            >
              {t(lang, 'login')}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
