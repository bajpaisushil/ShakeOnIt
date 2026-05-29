# ShakeOnIt 🤝

> Casual digital handshakes — from free pinky-promises with a calendar reminder, all the way to court-acceptable Aadhaar-eSigned micro-contracts.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind**
- **Prisma** + **Postgres** (Neon for hosted, free)
- **Razorpay** for payments (test or live keys)
- Phone-OTP auth (demo mode: code `000000`)
- Demo Aadhaar eSign UX (demo OTP: `123456`)

## Quick start

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL + DIRECT_URL
npx prisma db push            # creates tables in Neon
npm run dev
```

Open http://localhost:3000.

## Required environment variables

Set in `.env` locally and in your hosting provider (Vercel → Project → Settings → Environment Variables).

| Variable | Purpose | Required |
|---|---|---|
| `DATABASE_URL` | Neon **pooled** connection (URL ends in `-pooler.<region>.aws.neon.tech`). Used by the app at runtime. | **Yes** |
| `DIRECT_URL` | Neon **direct** connection. Used by `prisma db push` / `migrate`. | **Yes** |
| `RAZORPAY_KEY_ID` | Razorpay key ID (test: `rzp_test_…`, live: `rzp_live_…`). | Optional — simulated payments work without it |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret. | Required if `RAZORPAY_KEY_ID` is set |
| `DEMO_OTP` | Set to `"false"` to disable the `000000` login bypass (when you wire a real SMS provider). | Optional |

## Vercel deploy checklist

1. **Push to GitHub.**
2. **Create a Neon project** at https://neon.tech (free tier is plenty for early stage).
3. **Vercel → Add Project → import the repo.** Don't deploy yet.
4. **Vercel → Settings → Environment Variables → add** `DATABASE_URL`, `DIRECT_URL` (and Razorpay keys if you have them). Apply to *all* environments.
5. **Locally:** with `.env` set to the same Neon URLs, run `npx prisma db push` once. This creates the tables in Neon.
6. **Deploy.** The `prisma generate` step runs automatically as part of `npm run build`.
7. **(Optional)** Once you have a Razorpay test account, add `RAZORPAY_KEY_ID` (`rzp_test_…`) + `RAZORPAY_KEY_SECRET` and redeploy. The Pro tier checkout will switch from simulated to real test-mode payments.
8. **(Optional)** To switch off the `000000` OTP bypass, set `DEMO_OTP=false` and wire an SMS provider in `lib/auth.ts` (`generateOtp` returns a real code; just deliver it via MSG91/Twilio/AWS SNS).

## Routes

| Path | What it does |
|---|---|
| `/` | Landing tier picker (EN/HI toggle) |
| `/pinky` | Create a Pinky Promise (URL-encoded, no DB needed for this tier) |
| `/pinky?p=…` | Recipient view → "I Agree" → `.ics` calendar download + UPI Pay button |
| `/pro` | Pro tier template picker (loan / expense / service) |
| `/pro/new?t=loan` | Form → Review → Sign-up flow → waitlist row created |
| `/pro/esign/{id}` | The 4-step flow: Review → Pay (Razorpay) → Aadhaar → OTP → signed |
| `/login` | Phone OTP login (demo: any phone, code `000000`) |
| `/my` | User dashboard — list of drafts + signed contracts |
| `/wall` | Public Promise Wall (anonymized social proof) |
| `/api/auth/start` | Send OTP |
| `/api/auth/verify` | Verify OTP + create session |
| `/api/auth/logout` | Log out |
| `/api/waitlist` | POST a draft contract |
| `/api/razorpay/order` | Create a Razorpay order |
| `/api/razorpay/verify` | Verify Razorpay signature + mark paid |
| `/api/esign/sign` | Mark a draft as signed (demo) |
| `/api/esign/download/{id}` | Return the printable signed contract HTML |
| `/api/share` | Post anonymized entry to the Promise Wall |
| `/api/stats` | Wall stats JSON |

## Moats baked in

- **UPI deep links** on the Pinky tier — tap to pay, opens GPay/PhonePe/Paytm. Zero infrastructure, no eSign player has this.
- **Group promises** — multi-party splits (rent, road trips).
- **Public Promise Wall** — anonymized social proof / viral surface.
- **EN / हिं toggle** — Indian-first localization.
- **Drafted-then-signed funnel** — every Pro waitlist entry has a draft already, so when you wire real Aadhaar eSign the conversion is instant.
- **Demo eSign** — full UX visible to users and investors before the regulatory integration ships.

## Going from demo to real

| Today (demo) | Production swap |
|---|---|
| `lib/auth.ts` `DEMO_OTP_ENABLED=true` → accepts `000000` | Set `DEMO_OTP=false`; deliver `generateOtp()` via MSG91/Twilio |
| `lib/razorpay.ts` simulated mode when no keys | Set `RAZORPAY_KEY_ID/SECRET` (test or live) |
| `app/pro/esign/[id]/esign-client.tsx` Aadhaar OTP `123456` | Replace with Digio/Leegality eSign API call. The "signed PDF" they return replaces the HTML render in `lib/signed-contract.ts` |
| Mock signed contract HTML | Store the real PKCS#7-signed PDF from the eSign aggregator in object storage; serve via signed URL from `/api/esign/download/[id]` |
| No stamp duty | For loan / property contracts: bundle SHCIL e-stamping (Leegality offers this in their API) |

## Project layout

```
app/
├── layout.tsx
├── page.tsx                    # Landing (tier picker)
├── pinky/page.tsx              # Pinky Promise create + view (single file)
├── pro/
│   ├── page.tsx                # Template picker
│   ├── new/page.tsx            # Form → Review → Waitlist
│   └── esign/[id]/
│       ├── page.tsx            # eSign server entry (auth + load draft)
│       └── esign-client.tsx    # 4-step Review → Pay → Aadhaar → OTP → Done
├── login/page.tsx              # Phone OTP login
├── my/page.tsx                 # User dashboard
├── wall/page.tsx               # Public Promise Wall
└── api/                        # All POST/GET endpoints

lib/
├── auth.ts                     # Sessions, phone normalization, OTP helpers
├── contracts.ts                # Contract templates + draft rendering
├── db.ts                       # Prisma singleton
├── i18n.ts                     # EN/HI string dict + t()
├── ics.ts                      # .ics calendar file builder
├── lang-server.ts              # Read lang cookie from server components
├── promise.ts                  # Base64URL promise encode/decode
├── razorpay.ts                 # Razorpay API + simulated mode
├── signed-contract.ts          # Printable signed HTML render
└── upi.ts                      # UPI deep link builder

components/
├── Header.tsx                  # Auth-aware + lang toggle
└── LangToggle.tsx              # EN/HI switch

prisma/
└── schema.prisma               # User, Session, OtpCode, Waitlist, PublicPromise
```
