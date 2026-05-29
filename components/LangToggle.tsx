'use client';

import { useEffect, useState } from 'react';
import type { Lang } from '@/lib/i18n';
import { isLang } from '@/lib/i18n';

type Props = {
  initialLang: Lang;
  onChange?: (lang: Lang) => void;
};

export default function LangToggle({ initialLang, onChange }: Props) {
  const [lang, setLang] = useState<Lang>(initialLang);

  useEffect(() => {
    const stored = localStorage.getItem('shake_lang');
    if (stored && isLang(stored) && stored !== lang) setLang(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchTo = (next: Lang) => {
    setLang(next);
    localStorage.setItem('shake_lang', next);
    document.cookie = `shake_lang=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    onChange?.(next);
    // Refresh so server-rendered pages pick up the cookie.
    window.location.reload();
  };

  return (
    <div className="inline-flex bg-card border border-line rounded-full p-1 text-xs">
      <button
        onClick={() => switchTo('en')}
        className={`px-3 py-1 rounded-full transition-colors ${
          lang === 'en' ? 'bg-accent text-bg font-semibold' : 'text-muted hover:text-ink'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => switchTo('hi')}
        className={`px-3 py-1 rounded-full transition-colors ${
          lang === 'hi' ? 'bg-accent text-bg font-semibold' : 'text-muted hover:text-ink'
        }`}
      >
        हिं
      </button>
    </div>
  );
}
