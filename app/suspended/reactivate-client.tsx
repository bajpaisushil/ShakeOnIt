'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  outstandingPaise: number;
  userName: string;
  userPhone: string;
  paymentMode: 'live' | 'test' | 'simulated' | 'upi';
};

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export default function ReactivateClient({ outstandingPaise, paymentMode }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const rupees = (outstandingPaise / 100).toFixed(0);

  const pay = async () => {
    setError('');
    setBusy(true);
    try {
      const orderRes = await fetch('/api/account/reactivate?step=order', { method: 'POST' });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error || 'could not start payment');

      // Simulated mode: skip the hosted checkout
      if (order.simulated || paymentMode === 'simulated') {
        const verifyRes = await fetch('/api/account/reactivate?step=verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            paymentId: `pay_sim_${Date.now()}`,
            signature: `sim_${Date.now()}`,
          }),
        });
        if (!verifyRes.ok) throw new Error('verify failed');
        router.push('/my');
        router.refresh();
        return;
      }

      // Real payment provider path — when wired, this would open the checkout SDK
      // (Cashfree's drop-in / Razorpay's modal / etc.) and submit the result to verify.
      throw new Error('Real payment provider not wired yet — set PAYMENT_PROVIDER + keys');
    } catch (e: any) {
      setError(e.message || 'Could not start payment');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {paymentMode === 'simulated' && (
        <div className="bg-accent/15 border border-accent/40 rounded-xl p-3 text-sm mb-4">
          <strong>Simulated Mode:</strong> No real charge — clicking below instantly settles the outstanding.
        </div>
      )}

      <button onClick={pay} disabled={busy} className="btn btn-big">
        {busy ? 'Processing…' : `💳 Pay ₹${rupees} to reactivate`}
      </button>
      {error && <div className="text-danger text-sm text-center mt-3">{error}</div>}
    </>
  );
}
