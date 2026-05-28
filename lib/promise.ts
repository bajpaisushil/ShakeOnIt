// Promise = data that lives entirely inside the URL.
// Encoded as URL-safe Base64 of JSON. UTF-8 safe (rupee symbol, emoji etc).
// Field names are 1-char to keep URLs short — typical promise URL is ~150 chars.

export type PromiseV1 = {
  v: 1;
  f: string;        // from (debtor / promiser)
  t: string;        // to   (creditor / promisee)
  w: string;        // what (description)
  d: string;        // due date YYYY-MM-DD
  u?: string;       // UPI ID of the creditor (so the debtor can tap to pay)
  a?: number;       // amount in paise (₹1 = 100). Optional.
  g?: string[];     // group participants (additional names). Multi-party promises.
};

export function encodePromise(p: PromiseV1): string {
  const json = JSON.stringify(p);
  const utf8 = new TextEncoder().encode(json);
  let bin = '';
  utf8.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function decodePromise(b64: string): PromiseV1 {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
  const fullLen = padded + '==='.slice((padded.length + 3) % 4);
  const bin = atob(fullLen);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const obj = JSON.parse(new TextDecoder().decode(bytes));
  if (obj.v !== 1) throw new Error('Unsupported promise version');
  if (!obj.f || !obj.t || !obj.w || !obj.d) throw new Error('Missing required fields');
  return obj as PromiseV1;
}

export function formatRupees(paise?: number): string {
  if (!paise) return '';
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: rupees % 1 === 0 ? 0 : 2,
  }).format(rupees);
}

export function formatDate(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
