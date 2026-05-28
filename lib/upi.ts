// UPI deep links — the secret-weapon moat. No API, no fees, no signup.
// Tapping a upi:// link opens GPay / PhonePe / Paytm / BHIM with everything pre-filled.
// On Android: opens the app chooser. On iOS: opens whichever UPI app is installed.

export type UpiParams = {
  pa: string;        // payee VPA (e.g. sushil@oksbi)
  pn?: string;       // payee name
  am?: number;       // amount in rupees
  cu?: string;       // currency, default INR
  tn?: string;       // transaction note
  tr?: string;       // transaction reference (we use this to tie back to a promise)
};

const UPI_VPA_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;

export function isValidVPA(vpa: string): boolean {
  return UPI_VPA_RE.test(vpa.trim());
}

export function buildUpiLink(p: UpiParams): string {
  const params = new URLSearchParams();
  params.set('pa', p.pa);
  if (p.pn) params.set('pn', p.pn);
  if (p.am !== undefined) params.set('am', p.am.toFixed(2));
  params.set('cu', p.cu || 'INR');
  if (p.tn) params.set('tn', p.tn);
  if (p.tr) params.set('tr', p.tr);
  // upi:// scheme — universal across UPI apps
  return `upi://pay?${params.toString()}`;
}

// Fallback: GPay-specific scheme (sometimes more reliable on Android)
export function buildGPayLink(p: UpiParams): string {
  return buildUpiLink(p).replace(/^upi:\/\/pay/, 'tez://upi/pay');
}
