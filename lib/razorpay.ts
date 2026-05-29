// Razorpay integration. Operates in three modes:
//   1. PRODUCTION  — env vars RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET start with "rzp_live_"
//   2. TEST        — same env vars but "rzp_test_" prefix
//   3. SIMULATED   — no keys set → /api/razorpay/* endpoints return fake successful responses
//                    so the UI flow works end-to-end without a Razorpay account.
//
// Get test keys: https://dashboard.razorpay.com/app/keys (free signup, no KYC for test mode).

import { createHmac } from 'crypto';

const KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

export const RAZORPAY_ENABLED = Boolean(KEY_ID && KEY_SECRET);
export const RAZORPAY_MODE = !RAZORPAY_ENABLED
  ? 'simulated'
  : KEY_ID.startsWith('rzp_live_')
    ? 'live'
    : 'test';

export const PRO_PRICE_PAISE = 9900; // ₹99 per contract — adjust as you wish

export function publicKeyId(): string {
  return KEY_ID;
}

// Create an order via Razorpay's REST API. Returns the order JSON.
export async function createRazorpayOrder(amountPaise: number, receipt: string) {
  if (!RAZORPAY_ENABLED) {
    return {
      id: `order_sim_${Date.now()}`,
      amount: amountPaise,
      currency: 'INR',
      receipt,
      simulated: true,
    };
  }

  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')}`,
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: 'INR',
      receipt: receipt.slice(0, 40),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`razorpay order failed: ${res.status} ${text}`);
  }
  return res.json();
}

// Verify the HMAC signature returned by Razorpay Checkout on success.
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  if (!RAZORPAY_ENABLED) {
    return signature.startsWith('sim_'); // simulated mode accepts our fake sigs
  }
  const expected = createHmac('sha256', KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
}
