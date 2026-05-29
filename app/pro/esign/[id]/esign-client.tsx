'use client';

import { useState } from 'react';
import Link from 'next/link';

type Props = {
  id: string;
  draftText: string;
  templateLabel: string;
  creatorName: string;
  creatorPhone: string;
  pricePaise: number;
  paymentMode: 'live' | 'test' | 'simulated' | 'upi';
  platformUpiLink?: string | null;
  platformUpiVpa?: string;
  alreadyPaid: boolean;
};

type Step = 'review' | 'pay' | 'aadhaar' | 'otp' | 'signing' | 'done';

export default function EsignClient(props: Props) {
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
          <Link href="/my" className="text-xs text-muted hover:text-accent">← My drafts</Link>
        </div>
      </section>
    );
  }

  // ─── Step 2: Pay (eSign fee) ───
  if (step === 'pay') {
    const completeSimulated = async () => {
      setBusy(true);
      setError('');
      try {
        const orderRes = await fetch('/api/payments/order', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ waitlistId: props.id }),
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok) throw new Error(orderData.error || 'order failed');

        const sig = props.paymentMode === 'upi'
          ? `upi_${Date.now()}_${orderData.id.slice(-12)}`
          : `sim_${Date.now()}`;

        const verifyRes = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            waitlistId: props.id,
            orderId: orderData.id,
            paymentId: props.paymentMode === 'upi' ? `pay_upi_${Date.now()}` : `pay_sim_${Date.now()}`,
            signature: sig,
          }),
        });
        if (!verifyRes.ok) throw new Error('verify failed');
        setStep('aadhaar');
      } catch (e: any) {
        setError(e.message || 'Could not complete payment');
      } finally {
        setBusy(false);
      }
    };

    const startPayment = async () => {
      if (props.paymentMode === 'simulated') return completeSimulated();
      if (props.paymentMode === 'upi') {
        // Two-tap: open UPI app, then user confirms below
        if (props.platformUpiLink) window.location.href = props.platformUpiLink;
        return;
      }
      setError('No payment provider wired yet — set PAYMENT_PROVIDER + keys');
    };

    return (
      <section className="card">
        <div className="pill mb-3">Step 2 of 4 · Payment</div>
        <h1 className="text-xl font-bold mb-1">Pay ₹{rupees} to eSign</h1>
        <p className="text-sm text-muted mb-5">
          Covers Aadhaar OTP + signed PDF storage. One-time fee per contract.
        </p>

        <div className="bg-bg border border-line rounded-xl p-4 mb-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted">eSign fee</span>
            <span>₹{rupees}</span>
          </div>
          <div className="border-t border-line mt-2 pt-2 flex justify-between font-bold">
            <span>Total</span>
            <span>₹{rupees}</span>
          </div>
        </div>

        {props.paymentMode === 'simulated' && (
          <div className="bg-accent/15 border border-accent/40 rounded-xl p-3 text-sm mb-4">
            <strong>Simulated Mode:</strong> No real charge — clicking below instantly "succeeds"
            for the demo. Set <code className="text-xs">PLATFORM_UPI_VPA</code> in env to switch to
            real UPI collection (zero KYC).
          </div>
        )}

        {props.paymentMode === 'upi' && props.platformUpiVpa && (
          <div className="bg-good/15 border border-good/40 rounded-xl p-3 text-sm mb-4">
            <strong>💸 UPI Mode:</strong> Tap below to open your UPI app — money goes to
            <span className="font-mono"> {props.platformUpiVpa}</span>. After paying, return here
            and tap "I've paid" to continue.
          </div>
        )}

        {props.paymentMode === 'upi' ? (
          <div className="space-y-3">
            {/* Mobile: tap to open UPI app */}
            <a
              href={props.platformUpiLink ?? '#'}
              className="btn btn-big block text-center md:hidden"
            >
              💸 Open UPI app to pay ₹{rupees}
            </a>

            {/* Desktop OR fallback: QR code to scan with phone */}
            <div className="bg-white rounded-xl p-4 text-center">
              <div className="text-xs uppercase tracking-wider text-gray-600 mb-2 font-semibold">
                Scan with any UPI app
              </div>
              {props.platformUpiLink && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=0&data=${encodeURIComponent(props.platformUpiLink)}`}
                  alt="UPI payment QR"
                  width={260}
                  height={260}
                  className="mx-auto"
                />
              )}
              <div className="text-xs text-gray-600 mt-3 font-mono break-all">
                {props.platformUpiVpa}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                ₹{rupees} · GPay · PhonePe · Paytm · BHIM
              </div>
            </div>

            <button
              onClick={completeSimulated}
              disabled={busy}
              className="btn btn-big"
            >
              {busy ? 'Confirming…' : "✓ I've paid · continue"}
            </button>
            <p className="text-xs text-muted text-center leading-relaxed">
              Tap "I've paid" after the UPI transfer completes. The platform owner verifies in their
              UPI history before activating the contract. If payment doesn't show up, the contract
              stays unsigned.
            </p>
          </div>
        ) : (
          <button onClick={startPayment} disabled={busy} className="btn btn-big">
            {busy ? 'Processing…' : `💳 Pay ₹${rupees} now`}
          </button>
        )}
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
          <span className="font-mono font-bold text-accent">123456</span>.
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
          Sent to your Aadhaar-linked mobile (demo: <span className="font-mono font-bold text-accent">123456</span>).
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

  if (step === 'signing') {
    return (
      <section className="card text-center py-12">
        <div className="text-5xl mb-4 animate-pulse">✍️</div>
        <h1 className="text-xl font-bold mb-2">Signing your contract…</h1>
        <p className="text-sm text-muted">Generating signature hash and stamping the document.</p>
      </section>
    );
  }

  if (step === 'done') {
    return (
      <section className="card text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold mb-2">Signed!</h1>
        <p className="text-muted mb-5">
          Your contract is digitally signed and stored. We'll email a reminder on the due date with
          a tap-to-pay UPI link.
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
