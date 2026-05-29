# ShakeOnIt 🤝

> Casual digital handshakes — from free pinky-promises with a calendar reminder, all the way to Aadhaar-eSigned micro-contracts. No KYC required to launch; real money flows via direct UPI.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind**
- **Prisma** + **Postgres** (Neon, free tier)
- **Direct UPI** for payments (zero KYC — money lands in your personal UPI VPA)
- **Resend** for scheduled reminder emails (free 3,000/month, no KYC)
- Phone-OTP auth (demo: `000000`)
- Demo Aadhaar eSign UX (demo OTP: `123456`)
- Promise-keeping score + public wall for accountability

## Quick start

```bash
npm install
cp .env.example .env          # fill in DATABASE_URL + DIRECT_URL + PLATFORM_UPI_VPA
npx prisma db push            # creates tables in Neon
npm run dev
```

Open http://localhost:3000.

## Required environment variables

| Variable | Purpose | Required |
|---|---|---|
| `DATABASE_URL` | Neon **pooled** connection. Used by the app at runtime. | **Yes** |
| `DIRECT_URL` | Neon **direct** connection. Used by `prisma db push`. | **Yes** |
| `NEXT_PUBLIC_BASE_URL` | Public URL of your deployment (e.g. `https://shakeonit.app`). Used in email links. | **Yes** for prod |
| `PLATFORM_UPI_VPA` | Your UPI ID (e.g. `7827160996@ptyes`). When set, payments go directly to your UPI — **zero KYC**. | Recommended |
| `PLATFORM_UPI_NAME` | Name shown in the UPI app on the payee side (default `ShakeOnIt`). | Optional |
| `RESEND_API_KEY` | https://resend.com — free 3k emails/month. Without it, reminders log to console only. | Optional |
| `RESEND_FROM` | Sender email (default works without verifying a domain). | Optional |
| `CRON_SECRET` | Random string protecting `/api/cron/*` endpoints. Vercel Cron passes it automatically. | Recommended for prod |
| `DEMO_OTP` | Set to `"false"` to disable the `000000` login bypass when you wire SMS. | Optional |
| `PAYMENT_PROVIDER` | `"cashfree"` later, when you're ready for full UPI AutoPay. Leave blank for UPI-direct mode. | Optional |

## How payments work (zero KYC)

Set `PLATFORM_UPI_VPA` to your UPI ID. When a user clicks "Pay ₹99 to eSign":

1. Their browser opens GPay/PhonePe/Paytm/BHIM with the amount pre-filled and your VPA as the payee
2. They tap "Pay" in their UPI app → money lands in your account in seconds
3. They return to ShakeOnIt and tap **"I've paid · continue"**
4. You reconcile manually against your bank's UPI history for the first ~100 payments

When you eventually need higher volume / chargeback handling, set `PAYMENT_PROVIDER=cashfree` and add `CASHFREE_APP_ID` + `CASHFREE_SECRET_KEY` — the stubs in [lib/payments.ts](lib/payments.ts) take it from there.

## How the lightweight settlement flow works (no auto-debit)

Instead of UPI AutoPay (which needs NPCI partnership + KYC), we use:

1. **Daily reminder email** — `/api/cron/send-reminders` runs daily (Vercel Cron), finds contracts due within 24h, emails the lender with a "Mark as received" button and the borrower with a "Pay via UPI" tap-link.
2. **Mark-as-received** — lender taps the button (or `Mark as received` on `/my`), contract settles. Source of truth.
3. **Promise-keeping score** — `/api/cron/process-overdue` runs daily, decays the borrower's score by 1-3 points per day overdue.
4. **Public wall** — contracts 30+ days overdue get posted anonymized on the public wall ("Someone broke a ₹2,000 promise").

Score bands: 100=🟢 rock solid · 90=🟡 reliable · 70=🟠 patchy · 50=🔴 shaky · <30=⚠️ broken-promise zone.

## Routes

| Path | What it is |
|---|---|
| `/` | Landing tier picker (EN/HI toggle) |
| `/pinky` | Create a Pinky Promise (URL-encoded, no DB) |
| `/pinky?p=…` | View + agree → `.ics` calendar + UPI Pay button |
| `/pro` | Pro template picker (loan / expense / service) |
| `/pro/new?t=loan` | Form → Review → Sign-up → waitlist row |
| `/pro/esign/{id}` | 4-step: Review → Pay (UPI direct) → Aadhaar OTP → Done |
| `/login` | Phone OTP login (demo: any phone, code `000000`) |
| `/my` | Dashboard: drafts, promise score, mark-received button, tap-to-pay |
| `/wall` | Public Promise Wall (anonymized social proof) |
| `/suspended` | Suspended-account flow with reactivation payment |
| `/api/waitlist` | POST draft (anonymous or logged-in) |
| `/api/payments/order` + `/verify` | Generic order + verify (UPI / Cashfree / simulated) |
| `/api/esign/sign` + `/api/esign/download/{id}` | Demo signing + signed-PDF render |
| `/api/contract/{id}/mark-received` | Lender confirms receipt (session or magic-link) |
| `/api/contract/{id}/mark-paid` | Borrower says "I paid" (magic-link only) |
| `/api/cron/send-reminders` | Daily reminder email job (Vercel Cron) |
| `/api/cron/process-overdue` | Daily score + wall update job |
| `/api/auth/start` + `/verify` + `/logout` | Phone OTP auth |
| `/api/share` + `/api/stats` | Wall posts + counters |

## Vercel deploy checklist

1. **Push to GitHub.**
2. **Create a Neon project** at neon.tech.
3. **Set env vars on Vercel:** `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_BASE_URL`, `PLATFORM_UPI_VPA`, `RESEND_API_KEY` (optional), `CRON_SECRET`.
4. **Run `npx prisma db push`** locally against the same Neon URLs to create the tables.
5. **Deploy** — `prisma generate` runs as part of build. Vercel Cron picks up `vercel.json` automatically.

## Going from demo to real

| Today (demo) | Production swap |
|---|---|
| Phone OTP `000000` | Wire MSG91 / Twilio in `lib/auth.ts` (`generateOtp` returns a real code; deliver via SMS); set `DEMO_OTP=false` |
| Aadhaar OTP `123456` | Integrate Digio / Leegality / SignDesk via `lib/payments.ts` pattern; replace the `/api/esign/sign` mock with the aggregator's PKCS#7-signed PDF response |
| UPI direct (manual reconcile) | When volume justifies: swap to Cashfree (faster KYC than Razorpay) — `PAYMENT_PROVIDER=cashfree` + stub fill-in |
| Simulated mandate | Set `PAYMENT_PROVIDER=cashfree`, implement `cashfreeCreateMandate` + `cashfreeChargeMandate` (Subscriptions API) |

## Moats baked in

- **UPI deep links** on the Pinky tier — tap to pay, opens GPay/PhonePe/Paytm. Zero infra. No eSign player has this.
- **Direct-UPI payment mode** for the platform itself — collect ₹99/contract fees with zero KYC.
- **Group promises** (multi-party splits) in Pinky.
- **Public Promise Wall** with broken-promise posts — anonymized social pressure.
- **Promise-keeping score** — reputation moat.
- **EN / हिं toggle** — Indian-first localization.
- **Draft-first Pro funnel** — every waitlist entry has a draft ready, so when you wire real Aadhaar eSign the conversion is instant.
- **Demo eSign** — full UX visible to users and investors today.

## Project layout

```
app/
├── layout.tsx, page.tsx        # Landing (tier picker)
├── pinky/page.tsx              # Pinky Promise (URL-encoded, no DB)
├── pro/
│   ├── page.tsx                # Template picker
│   ├── new/page.tsx            # Form → Review → Waitlist
│   └── esign/[id]/
│       ├── page.tsx            # Server entry (auth + load draft)
│       └── esign-client.tsx    # 4 steps: Review → Pay → Aadhaar → OTP → Done
├── login/page.tsx              # Phone OTP
├── my/page.tsx + mark-received.tsx  # Dashboard + confirm-received UI
├── wall/page.tsx               # Promise wall
├── suspended/page.tsx + reactivate-client.tsx
└── api/
    ├── auth/{start,verify,logout}/route.ts
    ├── waitlist/route.ts
    ├── payments/{order,verify}/route.ts
    ├── esign/{sign,download/[id]}/route.ts
    ├── contract/[id]/{mark-paid,mark-received}/route.ts
    ├── cron/{send-reminders,process-overdue}/route.ts
    ├── account/reactivate/route.ts
    ├── share/route.ts
    └── stats/route.ts

lib/
├── auth.ts             # Sessions + phone OTP + signature hashing
├── contracts.ts        # Template renderers
├── db.ts               # Prisma singleton
├── email.ts            # Resend wrapper + reminder template
├── i18n.ts             # EN/HI strings + t()
├── ics.ts              # .ics file builder
├── lang-server.ts      # Read lang cookie
├── payments.ts         # Provider abstraction (UPI direct / Cashfree / simulated)
├── promise.ts          # Base64 URL-encoded pinky promise
├── score.ts            # Promise-keeping score helpers
├── signed-contract.ts  # Printable signed HTML
├── suspend.ts          # Account suspension helpers
└── upi.ts              # UPI deep link builder

components/
├── Header.tsx, LangToggle.tsx
prisma/
└── schema.prisma       # User, Session, OtpCode, Waitlist, Mandate, PublicPromise
vercel.json             # Cron schedule (9am + 9:30am IST daily)
```
