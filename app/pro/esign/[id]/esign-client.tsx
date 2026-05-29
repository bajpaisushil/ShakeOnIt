'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Props = {
  id: string;
  draftText: string;
  templateLabel: string;
  creatorName: string;
  creatorPhone: string;
  pricePaise: number;
  razorpayMode: 'live' | 'test' | 'simulated';
  razorpayKeyId: string;
  alreadyPaid: boolean;
};

type Step = 'review' | 'pay' | 'aadhaar' | 'otp' | 'signing' | 'done';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function EsignClient(props: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(props.alreadyPaid ? 'aadhaar' : 'review');
  const [aadhaar, setAadhaar] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const rupees = (props.pricePaise / 100).toFixed(0);

  // ─── Step 1: Review ───
  if (step === 'review') {
    return (
      <section className="card">
        <div className="pill mb-3">Step 1 of 4 · Review</div>
        <h1 className="text-xl font-bold mb-1">{props.templateLabel}</h1>
        <p className="text-sm text-muted mb-5">
          Confirm everything below is correct before signing.
        </p>
        <pre className="bg-bg border border-line rounded-xl p-4 text-sm whitespace-pre-wrap font-sans leading-relaxed mb-5 max-h-[400px] overflow-y-auto">
          {props.draftText}
        </pre>
        <button onClick={() => setStep('pay')} className="btn btn-big">
          Looks right · continue →
        </button>
        <div className="mt-3 text-center">
          <Link href="/my" className="text-xs text-muted hover:text-accent">
            ← My drafts
          </Link>
        </div>
      </section>
    );
  }

  // ─── Step 2: Pay ───
  if (step === 'pay') {
    const startPayment = async () => {
      setBusy(true);
      setError('');
      try {
        const orderRes = await fetch('/api/razorpay/order', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ waitlistId: props.id }),
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok) throw new Error(orderData.error || 'order failed');

        // Simulated mode: skip Razorpay UI entirely
        if (orderData.simulated) {
          const verifyRes = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              waitlistId: props.id,
              razorpay_order_id: orderData.id,
              razorpay_payment_id: `pay_sim_${Date.now()}`,
              razorpay_signature: `sim_${Date.now()}`,
            }),
          });
          if (!verifyRes.ok) throw new Error('verify failed');
          setStep('aadhaar');
          setBusy(false);
          return;
        }

        // Real Razorpay Checkout
        await loadRazorpayScript();
        const rzp = new window.Razorpay({
          key: props.razorpayKeyId,
          amount: orderData.amount,
          currency: 'INR',
          name: 'ShakeOnIt',
          description: `${props.templateLabel} eSign`,
          order_id: orderData.id,
          prefill: { contact: props.creatorPhone, name: props.creatorName },
          theme: { color: '#ff8906' },
          handler: async (resp: any) => {
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                waitlistId: props.id,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              }),
            });
            if (!verifyRes.ok) {
              setError('Payment verification failed — contact support.');
              return;
            }
            setStep('aadhaar');
          },
          modal: { ondismiss: () => setBusy(false) },
        });
        rzp.open();
      } catch (e: any) {
        setError(e.message || 'Could not start payment');
        setBusy(false);
      }
    };

    return (
      <section className="card">
        <div className="pill mb-3">Step 2 of 4 · Payment</div>
        <h1 className="text-xl font-bold mb-1">Pay ₹{rupees} to eSign</h1>
        <p className="text-sm text-muted mb-5">
          Covers Aadhaar OTP + stamping + signed PDF storage. One-time fee per contract.
        </p>

        <div className="bg-bg border border-line rounded-xl p-4 mb-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted">eSign fee</span>
            <span>₹{rupees}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted">GST (incl.)</span>
            <span>—</span>
          </div>
          <div className="border-t border-line mt-2 pt-2 flex justify-between font-bold">
            <span>Total</span>
            <span>₹{rupees}</span>
          </div>
        </div>

        {props.razorpayMode === 'simulated' && (
          <div className="bg-accent/15 border border-accent/40 rounded-xl p-3 text-sm mb-4">
            <strong>Simulated Mode:</strong> Razorpay keys not set — payment will succeed instantly without a real charge.
            Set <code className="text-xs">RAZORPAY_KEY_ID</code> + <code className="text-xs">RAZORPAY_KEY_SECRET</code> to go live.
          </div>
        )}
        {props.razorpayMode === 'test' && (
          <div className="bg-good/15 border border-good/40 rounded-xl p-3 text-sm mb-4">
            <strong>Test Mode:</strong> Use Razorpay test card <code className="text-xs">4111 1111 1111 1111</code>, any future expiry, any CVV.
          </div>
        )}

        <button onClick={startPayment} disabled={busy} className="btn btn-big">
          {busy ? 'Opening payment…' : `💳 Pay ₹${rupees} now`}
        </button>
        {error && <div className="text-danger text-sm text-center mt-3">{error}</div>}
      </section>
    );
  }

  // ─── Step 3: Aadhaar entry ───
  if (step === 'aadhaar') {
    const sendOtp = () => {
      setError('');
      if (!/^\d{12}$/.test(aadhaar.replace(/\s/g, ''))) {
        setError('Enter a 12-digit Aadhaar number (demo accepts any 12 digits)');
        return;
      }
      setStep('otp');
    };

    return (
      <section className="card">
        <div className="pill mb-3">Step 3 of 4 · Aadhaar</div>
        <h1 className="text-xl font-bold mb-1">Aadhaar eSign</h1>
        <p className="text-sm text-muted mb-3">
          Enter your 12-digit Aadhaar number. We'll send an OTP to your Aadhaar-linked mobile.
        </p>

        <div className="bg-accent/15 border border-accent/40 rounded-xl p-3 text-sm mb-4">
          <strong>Demo Mode:</strong> No UIDAI integration yet — enter any 12 digits and use OTP{' '}
          <span className="font-mono font-bold text-accent">123456</span>. No real Aadhaar data is sent anywhere.
        </div>

        <label className="label">Aadhaar number</label>
        <input
          className="input text-center text-lg tracking-widest font-mono"
          inputMode="numeric"
          maxLength={14}
          placeholder="XXXX XXXX XXXX"
          value={aadhaar}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
            const spaced = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
            setAadhaar(spaced);
          }}
        />

        <button onClick={sendOtp} className="btn btn-big mt-5">
          Send Aadhaar OTP →
        </button>
        {error && <div className="text-danger text-sm text-center mt-3">{error}</div>}

        <div className="text-xs text-muted text-center mt-4">
          By continuing you consent to ShakeOnIt verifying your identity via UIDAI for the sole purpose of signing this contract.
        </div>
      </section>
    );
  }

  // ─── Step 4: OTP + sign ───
  if (step === 'otp') {
    const sign = async () => {
      setError('');
      if (otp !== '123456') {
        setError('Demo OTP is 123456');
        return;
      }
      setBusy(true);
      setStep('signing');
      try {
        const res = await fetch('/api/esign/sign', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ waitlistId: props.id }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'sign failed');
        }
        setStep('done');
      } catch (e: any) {
        setError(e.message || 'Signing failed');
        setStep('otp');
      } finally {
        setBusy(false);
      }
    };

    return (
      <section className="card">
        <div className="pill mb-3">Step 4 of 4 · OTP</div>
        <h1 className="text-xl font-bold mb-1">Enter the OTP</h1>
        <p className="text-sm text-muted mb-5">
          Sent to your Aadhaar-linked mobile (in demo: use <span className="font-mono font-bold text-accent">123456</span>).
        </p>

        <label className="label">Aadhaar OTP</label>
        <input
          className="input text-center !text-2xl tracking-[0.5em] font-mono"
          inputMode="numeric"
          maxLength={6}
          placeholder="••••••"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && sign()}
        />

        <button onClick={sign} disabled={busy} className="btn btn-big mt-5">
          {busy ? 'Signing…' : '✍️ Sign now'}
        </button>
        {error && <div className="text-danger text-sm text-center mt-3">{error}</div>}
      </section>
    );
  }

  // ─── Signing animation ───
  if (step === 'signing') {
    return (
      <section className="card text-center py-12">
        <div className="text-5xl mb-4 animate-pulse">✍️</div>
        <h1 className="text-xl font-bold mb-2">Signing your contract…</h1>
        <p className="text-sm text-muted">Generating signature hash and stamping the document.</p>
      </section>
    );
  }

  // ─── Done ───
  if (step === 'done') {
    return (
      <section className="card text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold mb-2">Signed!</h1>
        <p className="text-muted mb-5">
          Your contract is digitally signed and stored. You can download a printable copy below.
        </p>
        <a
          href={`/api/esign/download/${props.id}`}
          target="_blank"
          rel="noopener"
          className="btn block text-center mb-3"
        >
          📄 View signed contract
        </a>
        <Link href="/my" className="btn btn-secondary block text-center">
          Back to my drafts
        </Link>
      </section>
    );
  }

  return null;
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load Razorpay'));
    document.body.appendChild(s);
  });
}
