'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { encodePromise, decodePromise, formatDate, formatRupees, type PromiseV1 } from '@/lib/promise';
import { downloadICS } from '@/lib/ics';
import { buildUpiLink, isValidVPA } from '@/lib/upi';

function PinkyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const code = params.get('p');

  // ----- VIEW MODE: someone clicked a share link -----
  if (code) {
    return <ViewPromise code={code} />;
  }

  // ----- CREATE MODE -----
  return <CreatePromise />;
}

function CreatePromise() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [what, setWhat] = useState('');
  const [amount, setAmount] = useState('');
  const [upi, setUpi] = useState('');
  const [group, setGroup] = useState('');
  const [when, setWhen] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [error, setError] = useState('');
  const [share, setShare] = useState<{ url: string; promise: PromiseV1 } | null>(null);
  const [copied, setCopied] = useState(false);
  const [postedToWall, setPostedToWall] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const generate = () => {
    const f = from.trim();
    const t = to.trim();
    const w = what.trim();
    if (!f || !t || !w || !when) {
      setError('Fill in all four required fields to lock it in.');
      return;
    }
    if (f.toLowerCase() === t.toLowerCase()) {
      setError("Can't make a promise to yourself.");
      return;
    }
    if (upi.trim() && !isValidVPA(upi.trim())) {
      setError('That UPI ID doesn\'t look right. Format: name@bank (e.g. sushil@oksbi)');
      return;
    }
    setError('');

    const amtPaise = amount.trim() ? Math.round(parseFloat(amount) * 100) : undefined;
    const groupNames = group
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean);

    const promise: PromiseV1 = {
      v: 1,
      f,
      t,
      w,
      d: when,
      ...(amtPaise && amtPaise > 0 ? { a: amtPaise } : {}),
      ...(upi.trim() ? { u: upi.trim() } : {}),
      ...(groupNames.length ? { g: groupNames } : {}),
    };

    const encoded = encodePromise(promise);
    const base = window.location.href.split('?')[0].split('#')[0];
    const url = `${base}?p=${encoded}`;
    setShare({ url, promise });
  };

  const copyLink = async () => {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback handled by browser
    }
  };

  const whatsapp = () => {
    if (!share) return;
    const amt = share.promise.a ? ` (${formatRupees(share.promise.a)})` : '';
    const msg = `Hey ${share.promise.t}, shake on this? 🤝\n\n"${share.promise.f} → ${share.promise.t}: ${share.promise.w}${amt}" by ${formatDate(share.promise.d)}\n\nTap to agree: ${share.url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const postToWall = async () => {
    if (!share || postedToWall) return;
    try {
      const blurb = share.promise.a
        ? `Someone promised ${formatRupees(share.promise.a)} by ${formatDate(share.promise.d)}`
        : `Someone made a promise to be kept by ${formatDate(share.promise.d)}`;
      await fetch('/api/share', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'pinky', blurb, amount: share.promise.a ?? null }),
      });
      setPostedToWall(true);
    } catch {
      // silent — non-critical
    }
  };

  // ===== SHARE VIEW =====
  if (share) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="text-center text-muted text-sm mb-6">Send this link to lock it in.</div>
        <section className="card">
          <div className="pill mb-3">✓ Link ready</div>
          <h1 className="text-xl font-bold mb-1">
            Send it to <span className="text-accent">{share.promise.t}</span>
          </h1>
          <p className="text-sm text-muted mb-5">
            They tap "I Agree" → it auto-adds to both your calendars.
            {share.promise.u && ' They\'ll also see a "Pay via UPI" button.'}
          </p>

          <div className="bg-bg border border-line rounded-xl px-4 py-3 font-mono text-xs text-muted break-all max-h-28 overflow-y-auto mb-4">
            {share.url}
          </div>

          <div className="flex gap-2 mb-3">
            <button onClick={copyLink} className="btn btn-secondary">
              {copied ? '✓ Copied' : '📋 Copy link'}
            </button>
            <button onClick={whatsapp} className="btn">
              💬 Send on WhatsApp
            </button>
          </div>

          <button
            onClick={postToWall}
            disabled={postedToWall}
            className="btn btn-secondary text-sm"
          >
            {postedToWall ? '✓ Posted to the public wall (anonymized)' : '📜 Brag on the public wall'}
          </button>

          <button
            onClick={() => {
              setShare(null);
              setFrom('');
              setTo('');
              setWhat('');
              setAmount('');
              setUpi('');
              setGroup('');
            }}
            className="btn btn-secondary mt-3"
          >
            Make another
          </button>
        </section>
      </div>
    );
  }

  // ===== CREATE VIEW =====
  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <div className="text-center text-muted text-sm mb-6">A pinky promise with a calendar reminder. No accounts, no database.</div>
      <section className="card">
        <h1 className="text-xl font-bold mb-1">Lock in a promise</h1>
        <p className="text-sm text-muted mb-6">
          Fill it in, share the link, and when they tap "I Agree" it lands in both your calendars.
        </p>

        <label className="label">Who's promising?</label>
        <input
          className="input"
          placeholder="Rahul"
          maxLength={40}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />

        <label className="label mt-4">Promising to whom?</label>
        <input
          className="input"
          placeholder="Sushil"
          maxLength={40}
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />

        <label className="label mt-4">What's the promise?</label>
        <textarea
          className="input min-h-[80px]"
          placeholder="Pay back for the concert tickets"
          maxLength={240}
          value={what}
          onChange={(e) => setWhat(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <label className="label">Amount (₹) — optional</label>
            <input
              className="input"
              type="number"
              placeholder="2000"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="label">By when?</label>
            <input
              className="input"
              type="date"
              min={today}
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>
        </div>

        <label className="label mt-4">UPI ID for repayment — optional</label>
        <input
          className="input"
          placeholder="sushil@oksbi"
          value={upi}
          onChange={(e) => setUpi(e.target.value)}
        />
        <p className="text-xs text-muted mt-1">
          If set, they'll get a "Pay via UPI" button when they agree. Works with GPay/PhonePe/Paytm/BHIM.
        </p>

        <label className="label mt-4">Group promise? — optional</label>
        <input
          className="input"
          placeholder="Aanya, Vikram (comma-separated)"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
        />
        <p className="text-xs text-muted mt-1">
          Add others if this is a multi-person agreement (rent split, group trip, etc.)
        </p>

        <button className="btn btn-big mt-6" onClick={generate}>
          Generate the handshake →
        </button>

        {error && <div className="text-danger text-sm text-center mt-3">{error}</div>}

        <div className="mt-6 text-center">
          <Link href="/pro" className="text-xs text-muted hover:text-accent">
            Need it court-acceptable? Try the Pro tier →
          </Link>
        </div>
      </section>
    </div>
  );
}

function ViewPromise({ code }: { code: string }) {
  const [promise, setPromise] = useState<PromiseV1 | null>(null);
  const [error, setError] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    try {
      const p = decodePromise(code);
      setPromise(p);
      document.title = `🤝 ${p.f} → ${p.t} — ShakeOnIt`;
    } catch {
      setError(true);
    }
  }, [code]);

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12">

        <div className="card text-center">
          <h1 className="text-xl font-bold mb-2">That link looks broken 😬</h1>
          <p className="text-sm text-muted mb-5">
            It might be incomplete or copy-pasted incorrectly. Ask whoever sent it to resend, or start fresh.
          </p>
          <Link href="/pinky" className="btn inline-block">
            Start fresh
          </Link>
        </div>
      </div>
    );
  }

  if (!promise) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12">

        <div className="card text-center text-muted">Loading…</div>
      </div>
    );
  }

  const handleAgree = () => {
    downloadICS(promise);
    setAgreed(true);
    // Notify the wall (anonymized) that a promise was agreed to
    const blurb = promise.a
      ? `Someone agreed to ${formatRupees(promise.a)} by ${formatDate(promise.d)}`
      : `A promise was sealed for ${formatDate(promise.d)}`;
    fetch('/api/share', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: 'pinky',
        blurb,
        amount: promise.a ?? null,
        agreed: true,
      }),
    }).catch(() => {});
  };

  const upiLink =
    promise.u && promise.a
      ? buildUpiLink({
          pa: promise.u,
          pn: promise.t,
          am: promise.a / 100,
          tn: `ShakeOnIt: ${promise.w.slice(0, 40)}`,
        })
      : promise.u
        ? buildUpiLink({ pa: promise.u, pn: promise.t, tn: `ShakeOnIt: ${promise.w.slice(0, 40)}` })
        : null;

  return (
    <div className="max-w-xl mx-auto px-6 py-12">

      <section className="card">
        <div className={`pill ${agreed ? 'pill-good' : ''} mb-3`}>
          {agreed ? '✓ Locked in' : '📜 Incoming promise'}
        </div>
        <h2 className="text-lg font-semibold leading-relaxed mb-5">
          &ldquo;{promise.w}&rdquo;
          {promise.a ? ` (${formatRupees(promise.a)})` : ''} — {promise.f} to {promise.t}.
        </h2>

        <div className="flex justify-between text-sm text-muted border-b border-line pb-4 mb-4">
          <span>
            From <strong className="text-ink font-semibold">{promise.f}</strong>
          </span>
          <span>
            Due <strong className="text-ink font-semibold">{formatDate(promise.d)}</strong>
          </span>
        </div>

        {promise.g && promise.g.length > 0 && (
          <div className="text-sm text-muted mb-4">
            Group: <span className="text-ink">{[promise.f, ...promise.g].join(', ')}</span>
          </div>
        )}

        {!agreed && (
          <>
            <p className="text-sm text-muted mb-5">
              Tap to lock it in. We&apos;ll drop a calendar reminder on your phone for the due date.
            </p>
            <button onClick={handleAgree} className="btn btn-big">
              ✋ I Agree — Shake on it
            </button>
          </>
        )}

        {agreed && (
          <div className="space-y-3">
            <div className="text-good text-sm text-center py-2">
              🎉 Done! Calendar file downloaded. Open it to add the reminder.
            </div>

            {upiLink && (
              <a
                href={upiLink}
                className="btn block text-center !bg-good"
                style={{ color: '#0f0e17' }}
              >
                💸 Pay {promise.a ? formatRupees(promise.a) : ''} via UPI now
              </a>
            )}

            <Link href="/pinky" className="btn btn-secondary block text-center">
              Make your own promise
            </Link>
          </div>
        )}
      </section>

      {promise.a && promise.a > 200000 && (
        <div className="card mt-4 !p-5 border-accent/30">
          <div className="text-xs text-muted mb-1">Heads up</div>
          <div className="text-sm">
            This is a significant amount. Want a court-acceptable, Aadhaar-eSigned version?{' '}
            <Link href="/pro" className="text-accent underline">
              See the Pro tier →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PinkyPage() {
  return (
    <Suspense fallback={<div className="text-center text-muted p-12">Loading…</div>}>
      <PinkyInner />
    </Suspense>
  );
}
