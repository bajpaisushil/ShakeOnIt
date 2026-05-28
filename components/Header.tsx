import Link from 'next/link';

export default function Header({ subtitle }: { subtitle?: string }) {
  return (
    <header className="text-center mb-8">
      <Link href="/" className="inline-block">
        <div className="text-3xl font-extrabold tracking-tight">
          <span className="inline-block -rotate-12">🤝</span> ShakeOnIt
        </div>
      </Link>
      <div className="text-muted text-sm mt-1">
        {subtitle ?? 'Casual promises, made to stick.'}
      </div>
    </header>
  );
}
