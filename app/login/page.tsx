'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('to') || '/my';

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [demoCode, setDemoCode] = useState<string | null>(null);

  const sendOtp = async () => {
    setError('');
    if (!/^[6-9]\d{9}$/.test(phone.replace(/\D/g, '').replace(/^91/, ''))) {
      setError('Enter a 10-digit Indian mobile number');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not send code');
        return;
      }
      if (data.demo) setDemoCode(data.demoCode);
      setStep('otp');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setError('');
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ phone, code, name: name.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid code');
        return;
      }
      router.push(redirect);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <div className="text-center text-muted text-sm mb-6">Sign in with your phone</div>
      <section className="card">
        {step === 'phone' ? (
          <>
            <h1 className="text-xl font-bold mb-1">Welcome back</h1>
            <p className="text-sm text-muted mb-5">
              We'll text you a 6-digit code. No password needed.
            </p>

            <label className="label">Mobile number</label>
            <div className="flex gap-2">
              <div className="input w-16 text-center !cursor-default">+91</div>
              <input
                className="input flex-1"
                type="tel"
                maxLength={10}
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendOtp()}
              />
            </div>

            <label className="label mt-4">Your name (optional)</label>
            <input
              className="input"
              placeholder="As on Aadhaar"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <button onClick={sendOtp} disabled={busy} className="btn btn-big mt-6">
              {busy ? 'Sending…' : 'Send OTP →'}
            </button>
            {error && <div className="text-danger text-sm text-center mt-3">{error}</div>}
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold mb-1">Enter the 6-digit code</h1>
            <p className="text-sm text-muted mb-5">
              Sent to +91-{phone}.{' '}
              <button onClick={() => setStep('phone')} className="text-accent">
                Change number
              </button>
            </p>

            {demoCode && (
              <div className="bg-accent/15 border border-accent/40 rounded-xl p-3 text-sm mb-4">
                <strong>Demo Mode:</strong> No SMS provider yet — use code{' '}
                <span className="font-mono font-bold text-accent">{demoCode}</span>
              </div>
            )}

            <label className="label">OTP</label>
            <input
              className="input text-center !text-2xl tracking-[0.5em] font-mono"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && verify()}
              autoFocus
            />

            <button onClick={verify} disabled={busy} className="btn btn-big mt-6">
              {busy ? 'Verifying…' : 'Verify & log in →'}
            </button>
            {error && <div className="text-danger text-sm text-center mt-3">{error}</div>}
          </>
        )}

        <div className="mt-6 text-center">
          <Link href="/" className="text-xs text-muted hover:text-accent">
            ← Back to home
          </Link>
        </div>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center text-muted p-12">Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}
