import Link from 'next/link';
import { TEMPLATE_META } from '@/lib/contracts';

export default function ProPicker() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="text-center text-muted text-sm mb-6">Court-acceptable contracts. Pick a template to start.</div>

      <div className="card mb-6 !p-5 border-accent/40">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🛡️</div>
          <div className="text-sm">
            <div className="font-semibold mb-1">How the Pro tier works</div>
            <div className="text-muted leading-relaxed">
              Draft the contract here. When the other party agrees, both of you eSign via Aadhaar OTP
              (legally equivalent to a handwritten signature under IT Act § 5). We send you a court-admissible
              PDF with an audit trail. Aadhaar eSign launches soon — drafts you create now join the waitlist
              and convert the moment it goes live.
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {(Object.entries(TEMPLATE_META) as [keyof typeof TEMPLATE_META, typeof TEMPLATE_META[keyof typeof TEMPLATE_META]][]).map(
          ([key, meta]) => (
            <Link
              key={key}
              href={`/pro/new?t=${key}`}
              className="card hover:border-accent transition-colors flex items-center gap-4"
            >
              <div className="text-4xl">{meta.emoji}</div>
              <div className="flex-1">
                <div className="font-bold text-lg">{meta.label}</div>
                <div className="text-sm text-muted">{meta.blurb}</div>
              </div>
              <div className="text-accent">→</div>
            </Link>
          ),
        )}
      </div>

      <div className="mt-8 text-xs text-muted text-center leading-relaxed">
        Not legally signable yet: real estate sale/mortgage, wills, marriage/divorce, negotiable instruments,
        powers of attorney for property. These are excluded from Aadhaar eSign under Schedule 1 of the IT Act.
      </div>

      <div className="mt-6 text-center">
        <Link href="/" className="text-sm text-muted hover:text-accent">
          ← Back to ShakeOnIt
        </Link>
      </div>
    </div>
  );
}
