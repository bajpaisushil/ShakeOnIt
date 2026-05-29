// Email via Resend (https://resend.com — 3,000 emails/month free, 100/day, no KYC for free tier).
//
// Setup:
//   1. Sign up at resend.com (Google login is fine)
//   2. Get API key from https://resend.com/api-keys
//   3. Set RESEND_API_KEY in .env
//   4. (Optional) Verify a domain to send from "noreply@yourdomain.com". Until you do,
//      you can only send TO your verified email — fine for testing.
//   5. Set RESEND_FROM (default: "ShakeOnIt <onboarding@resend.dev>" works for testing without a domain)
//
// Without RESEND_API_KEY, the wrapper runs in SIMULATED mode — logs the email body
// and records reminderSentAt but doesn't actually deliver. Useful for dev.

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM || 'ShakeOnIt <onboarding@resend.dev>';

export const EMAIL_ENABLED = Boolean(RESEND_API_KEY);

export type SendArgs = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendEmail(args: SendArgs): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!EMAIL_ENABLED) {
    console.log('[email simulated]', { to: args.to, subject: args.subject });
    return { ok: true, id: `sim_${Date.now()}` };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: args.to,
        subject: args.subject,
        html: args.html,
        reply_to: args.replyTo,
      }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.message ?? `HTTP ${res.status}` };
    return { ok: true, id: data.id };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'send failed' };
  }
}

// ─── Templates ────────────────────────────────────────────────────────────

function escapeHTML(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function rupees(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });
}

export function reminderEmail(args: {
  recipientName: string;
  fromName: string;
  contractSummary: string;
  amountPaise?: number;
  dueDateISO: string;
  upiLink?: string;
  iPaidUrl?: string;
  markReceivedUrl?: string;
  isLender: boolean;          // determines which CTA to emphasize
  baseUrl: string;
}): { subject: string; html: string } {
  const dueDate = new Date(args.dueDateISO + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const amount = args.amountPaise ? rupees(args.amountPaise) : '';

  const subject = args.isLender
    ? `Reminder: ${args.fromName} owes you${amount ? ` ${amount}` : ''} — due ${dueDate}`
    : `Friendly reminder: ${amount || 'your promise'} due ${dueDate}`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;line-height:1.55;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="font-size:22px;font-weight:800;letter-spacing:-0.01em;margin-bottom:24px;">
      <span style="display:inline-block;transform:rotate(-12deg);">🤝</span> ShakeOnIt
    </div>

    <div style="background:#fff;border:1px solid #e6e3da;border-radius:12px;padding:28px;box-shadow:0 4px 20px rgba(0,0,0,0.04);">
      <div style="display:inline-block;background:#fff4e5;color:#cc6a00;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;margin-bottom:14px;">
        ⏰ Reminder · Due ${dueDate}
      </div>

      <h1 style="font-size:20px;margin:0 0 14px;line-height:1.35;">
        ${args.isLender ? `${escapeHTML(args.fromName)} promised to pay you${amount ? ` <b>${amount}</b>` : ''} by ${dueDate}.` : `Heads up — your promise${amount ? ` to pay <b>${amount}</b>` : ''} is due ${dueDate}.`}
      </h1>

      <div style="background:#faf9f4;border-radius:8px;padding:14px;font-size:14px;color:#555;margin:18px 0;">
        “${escapeHTML(args.contractSummary)}”
      </div>

      ${args.isLender ? lenderCTAs(args) : borrowerCTAs(args)}

      <div style="margin-top:24px;padding-top:18px;border-top:1px solid #eee;font-size:12px;color:#888;">
        Sent by ShakeOnIt because you set up this commitment. <br>
        <a href="${args.baseUrl}/my" style="color:#888;">View all your contracts →</a>
      </div>
    </div>
  </div>
</body></html>`;

  return { subject, html };
}

function lenderCTAs(args: {
  markReceivedUrl?: string;
  amountPaise?: number;
}): string {
  if (!args.markReceivedUrl) return '';
  return `
    <a href="${args.markReceivedUrl}" style="display:block;background:#16a34a;color:#fff;text-decoration:none;text-align:center;padding:14px 18px;border-radius:8px;font-weight:600;margin:14px 0 8px;">
      ✓ Mark as received
    </a>
    <p style="font-size:12px;color:#666;text-align:center;margin:8px 0 0;">
      Tap if they already paid you. Otherwise this stays open and we'll nudge them too.
    </p>`;
}

function borrowerCTAs(args: {
  upiLink?: string;
  iPaidUrl?: string;
  amountPaise?: number;
}): string {
  const amt = args.amountPaise ? ` ${rupees(args.amountPaise)}` : '';
  return `
    ${
      args.upiLink
        ? `<a href="${args.upiLink}" style="display:block;background:#ff8906;color:#1a1a1a;text-decoration:none;text-align:center;padding:14px 18px;border-radius:8px;font-weight:700;margin:14px 0 8px;">
            💸 Pay${amt} via UPI now
          </a>
          <p style="font-size:12px;color:#666;text-align:center;margin:6px 0 14px;">
            Opens GPay / PhonePe / Paytm / BHIM with everything pre-filled.
          </p>`
        : ''
    }
    ${
      args.iPaidUrl
        ? `<a href="${args.iPaidUrl}" style="display:block;background:transparent;color:#1a1a1a;text-decoration:none;text-align:center;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:13px;">
            I've already paid — let them know
          </a>`
        : ''
    }`;
}
