// Payment provider abstraction. Provider-agnostic interface so the rest of
// the app doesn't care which payment gateway is wired up.
//
// Recommended providers for Indian businesses (in order of onboarding ease):
//   1. CASHFREE   — fastest KYC (3-5 days), supports UPI AutoPay (mandates), good API.
//                   Sign up: https://www.cashfree.com/  (they're known for accepting businesses
//                   that Razorpay rejects).
//   2. PAYU       — older but more lenient on onboarding.
//   3. INSTAMOJO  — easiest for indie founders, limited recurring support.
//   4. PHONEPE_BUSINESS — direct UPI integration if you already have PhonePe Business.
//
// All of them support one-time payments + UPI AutoPay mandates.
//
// To go live: set PAYMENT_PROVIDER=cashfree + CASHFREE_APP_ID + CASHFREE_SECRET_KEY,
// then implement the four functions in the cashfree section below.

import { createHmac } from 'crypto';

type Provider = 'cashfree' | 'upi' | 'simulated';

export const PLATFORM_UPI_VPA = process.env.PLATFORM_UPI_VPA || '';
export const PLATFORM_UPI_NAME = process.env.PLATFORM_UPI_NAME || 'ShakeOnIt';

// Auto-pick provider:
//   1. PAYMENT_PROVIDER env var if set
//   2. Cashfree if CASHFREE_APP_ID is set
//   3. UPI direct if PLATFORM_UPI_VPA is set (real money, zero KYC — recommended for early stage)
//   4. Simulated (UX-only, no real money)
export const PROVIDER: Provider =
  (process.env.PAYMENT_PROVIDER as Provider) ||
  (process.env.CASHFREE_APP_ID ? 'cashfree' : PLATFORM_UPI_VPA ? 'upi' : 'simulated');

export const PAYMENT_ENABLED = PROVIDER !== 'simulated';
export const PAYMENT_MODE: 'live' | 'test' | 'simulated' | 'upi' =
  PROVIDER === 'upi'
    ? 'upi'
    : PROVIDER === 'simulated'
      ? 'simulated'
      : process.env.PAYMENT_ENV === 'live'
        ? 'live'
        : 'test';

export const PRO_PRICE_PAISE = 9900;       // ₹99 per contract eSign
export const MANDATE_SETUP_PAISE = 0;       // mandate setup free; charged when triggered

// ─── Public API used by the app ──────────────────────────────────────────

export type Order = {
  id: string;
  amount: number;
  currency: 'INR';
  receipt: string;
  simulated?: boolean;
};

export async function createOrder(amountPaise: number, receipt: string): Promise<Order> {
  if (PROVIDER === 'simulated') {
    return { id: `order_sim_${Date.now()}`, amount: amountPaise, currency: 'INR', receipt, simulated: true };
  }
  if (PROVIDER === 'upi') {
    return { id: `order_upi_${Date.now()}_${receipt}`, amount: amountPaise, currency: 'INR', receipt };
  }
  if (PROVIDER === 'cashfree') return cashfreeCreateOrder(amountPaise, receipt);
  throw new Error(`unsupported PAYMENT_PROVIDER: ${PROVIDER}`);
}

export function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
  if (PROVIDER === 'simulated') return signature.startsWith('sim_');
  if (PROVIDER === 'upi') {
    // Trust-based: the user clicks "I've paid", we accept any signature that
    // includes the order id. You then reconcile manually against your UPI history.
    // If they lie, you don't mark it received → contract stays unsettled → score drops.
    return signature.startsWith('upi_') && signature.includes(orderId.slice(-12));
  }
  if (PROVIDER === 'cashfree') return cashfreeVerifySignature(orderId, paymentId, signature);
  return false;
}

// Build a UPI deep link for the platform's own collection (eSign fee, reactivate, etc.)
// Returns null if PLATFORM_UPI_VPA isn't configured.
export function buildPlatformUpiLink(args: {
  amountPaise: number;
  note: string;
  reference: string;
}): string | null {
  if (!PLATFORM_UPI_VPA) return null;
  const params = new URLSearchParams();
  params.set('pa', PLATFORM_UPI_VPA);
  params.set('pn', PLATFORM_UPI_NAME);
  params.set('am', (args.amountPaise / 100).toFixed(2));
  params.set('cu', 'INR');
  params.set('tn', args.note.slice(0, 60));
  params.set('tr', args.reference.slice(0, 35));
  return `upi://pay?${params.toString()}`;
}

export type MandateAuth = {
  id: string;                    // our mandate id
  authUrl?: string;              // URL to redirect/popup for user authorization
  status: 'pending' | 'active';
  simulated?: boolean;
};

// Set up a UPI AutoPay mandate. The user authorizes once; we then charge it on the due date.
export async function createMandate(args: {
  userId: string;
  phone: string;
  amountPaise: number;
  scheduledFor: Date;
  description: string;
}): Promise<MandateAuth> {
  if (PROVIDER === 'simulated') {
    return {
      id: `mnd_sim_${Date.now()}`,
      status: 'active',           // simulated mandate is "pre-authorized" — no UPI screen needed
      simulated: true,
    };
  }
  if (PROVIDER === 'cashfree') return cashfreeCreateMandate(args);
  throw new Error(`unsupported PAYMENT_PROVIDER: ${PROVIDER}`);
}

// Trigger a debit against an existing mandate. Returns success/failure.
export async function chargeMandate(args: {
  mandateId: string;
  amountPaise: number;
  forceFail?: boolean;            // demo-only: lets the user simulate a failed debit
}): Promise<{ ok: boolean; paymentId?: string; reason?: string }> {
  if (PROVIDER === 'simulated') {
    if (args.forceFail) {
      return { ok: false, reason: 'Insufficient funds (simulated)' };
    }
    return { ok: true, paymentId: `pay_sim_${Date.now()}` };
  }
  if (PROVIDER === 'cashfree') return cashfreeChargeMandate(args);
  throw new Error(`unsupported PAYMENT_PROVIDER: ${PROVIDER}`);
}

// ─── Cashfree adapter (stubs — fill in when you have credentials) ────────

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || '';
const CASHFREE_SECRET = process.env.CASHFREE_SECRET_KEY || '';
const CASHFREE_BASE =
  PAYMENT_MODE === 'live'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';

async function cashfreeCreateOrder(amountPaise: number, receipt: string): Promise<Order> {
  const res = await fetch(`${CASHFREE_BASE}/orders`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-version': '2023-08-01',
      'x-client-id': CASHFREE_APP_ID,
      'x-client-secret': CASHFREE_SECRET,
    },
    body: JSON.stringify({
      order_id: `ord_${receipt}_${Date.now()}`,
      order_amount: (amountPaise / 100).toFixed(2),
      order_currency: 'INR',
      customer_details: {
        customer_id: receipt,
        customer_phone: '9999999999',                 // overridden client-side
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`cashfree order failed: ${JSON.stringify(data)}`);
  return {
    id: data.order_id,
    amount: amountPaise,
    currency: 'INR',
    receipt,
  };
}

function cashfreeVerifySignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = createHmac('sha256', CASHFREE_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('base64');
  return expected === signature;
}

async function cashfreeCreateMandate(_args: {
  userId: string;
  phone: string;
  amountPaise: number;
  scheduledFor: Date;
  description: string;
}): Promise<MandateAuth> {
  // TODO: call Cashfree Subscriptions API
  // https://docs.cashfree.com/reference/createsubscription
  // Returns a hosted authorization URL — redirect user to it; on return,
  // the subscription becomes "ACTIVE" once they authorize via UPI.
  throw new Error(
    'Cashfree mandate not yet implemented — see lib/payments.ts:cashfreeCreateMandate',
  );
}

async function cashfreeChargeMandate(_args: {
  mandateId: string;
  amountPaise: number;
}): Promise<{ ok: boolean; paymentId?: string; reason?: string }> {
  // TODO: call Cashfree's "charge a subscription" / "Manage subscription" endpoint
  throw new Error(
    'Cashfree charge not yet implemented — see lib/payments.ts:cashfreeChargeMandate',
  );
}
