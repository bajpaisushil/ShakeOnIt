'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  renderContract,
  TEMPLATE_META,
  type Contract,
  type LoanContract,
  type ExpenseContract,
  type ServiceContract,
} from '@/lib/contracts';

type TemplateKey = keyof typeof TEMPLATE_META;

function ProNewInner() {
  const params = useSearchParams();
  const router = useRouter();
  const tParam = params.get('t') as TemplateKey | null;
  const t: TemplateKey = tParam && tParam in TEMPLATE_META ? tParam : 'loan';

  const [step, setStep] = useState<'form' | 'review' | 'sign' | 'done'>('form');
  const [contract, setContract] = useState<Contract | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  // Sign-step inputs
  const [creatorName, setCreatorName] = useState('');
  const [creatorEmail, setCreatorEmail] = useState('');
  const [creatorPhone, setCreatorPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [waitlistPos, setWaitlistPos] = useState<number | null>(null);
  const [waitlistId, setWaitlistId] = useState<string | null>(null);
  const [upiVpa, setUpiVpa] = useState('');

  const handleDraft = (c: Contract) => {
    const text = renderContract(c);
    setContract(c);
    setDraft(text);
    setStep('review');
    window.scrollTo({ top: 0 });
  };

  const handleSubmit = async () => {
    if (!contract) return;
    if (!creatorName.trim() || !creatorEmail.trim() || !creatorPhone.trim()) {
      setError('Your name, email, and phone are needed so we can notify you when eSign launches.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(creatorEmail)) {
      setError('That email doesn\'t look right.');
      return;
    }
    if (!/^[+0-9 -]{7,15}$/.test(creatorPhone)) {
      setError('Phone should be your mobile number (10 digits or +91 format).');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          templateType: contract.type,
          contractData: contract,
          creatorName: creatorName.trim(),
          creatorEmail: creatorEmail.trim(),
          creatorPhone: creatorPhone.trim(),
          recipientName: recipientName.trim() || null,
          recipientPhone: recipientPhone.trim() || null,
          draftText: draft,
          upiVpa: upiVpa.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setWaitlistPos(data.position ?? null);
      setWaitlistId(data.id ?? null);
      setStep('done');
    } catch {
      setError('Couldn\'t save your draft. Try again in a sec.');
    } finally {
      setSubmitting(false);
    }
  };

  // ============ FORM STEP ============
  if (step === 'form') {
    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="text-center text-muted text-sm mb-6">{TEMPLATE_META[t].label}</div>
        <section className="card">
          <div className="flex items-center gap-3 mb-5">
            <div className="text-3xl">{TEMPLATE_META[t].emoji}</div>
            <div>
              <h1 className="text-xl font-bold">{TEMPLATE_META[t].label}</h1>
              <p className="text-sm text-muted">{TEMPLATE_META[t].blurb}</p>
            </div>
          </div>

          {t === 'loan' && <LoanForm onDraft={handleDraft} />}
          {t === 'expense' && <ExpenseForm onDraft={handleDraft} />}
          {t === 'service' && <ServiceForm onDraft={handleDraft} />}

          <div className="mt-6 text-center">
            <Link href="/pro" className="text-sm text-muted hover:text-accent">
              ← Pick a different template
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // ============ REVIEW STEP ============
  if (step === 'review' && contract) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center text-muted text-sm mb-6">Review the draft</div>
        <section className="card">
          <div className="pill mb-3">Step 2 of 3 · Review</div>
          <h1 className="text-xl font-bold mb-1">Does this look right?</h1>
          <p className="text-sm text-muted mb-5">
            This is what both parties will eSign. You can edit it by going back.
          </p>

          <pre className="bg-bg border border-line rounded-xl p-4 text-sm whitespace-pre-wrap font-sans leading-relaxed mb-5 max-h-[450px] overflow-y-auto">
            {draft}
          </pre>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setStep('form')} className="btn btn-secondary">
              ← Edit
            </button>
            <button onClick={() => setStep('sign')} className="btn">
              Continue to sign →
            </button>
          </div>
        </section>
      </div>
    );
  }

  // ============ SIGN STEP (waitlist capture) ============
  if (step === 'sign' && contract) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="text-center text-muted text-sm mb-6">Join the eSign waitlist</div>
        <section className="card">
          <div className="pill mb-3">Step 3 of 3 · Sign</div>
          <h1 className="text-xl font-bold mb-1">Save your draft + claim a spot</h1>
          <p className="text-sm text-muted mb-5">
            Aadhaar eSign is launching soon. Drop your details — when it goes live, we notify both of you
            and the contract is signable in 30 seconds.
          </p>

          <label className="label">Your full name</label>
          <input
            className="input"
            placeholder="As on Aadhaar"
            value={creatorName}
            onChange={(e) => setCreatorName(e.target.value)}
          />

          <label className="label mt-4">Your email</label>
          <input
            className="input"
            type="email"
            placeholder="you@example.com"
            value={creatorEmail}
            onChange={(e) => setCreatorEmail(e.target.value)}
          />

          <label className="label mt-4">Your mobile number</label>
          <input
            className="input"
            type="tel"
            placeholder="9876543210"
            value={creatorPhone}
            onChange={(e) => setCreatorPhone(e.target.value)}
          />
          <p className="text-xs text-muted mt-1">
            We'll send the eSign launch notification here. Used for Aadhaar OTP later.
          </p>

          <div className="border-t border-line my-5 pt-5">
            <div className="text-sm font-semibold mb-3">Other party (optional now)</div>
            <label className="label">Their name</label>
            <input
              className="input"
              placeholder="Their full name"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
            <label className="label mt-3">Their mobile</label>
            <input
              className="input"
              type="tel"
              placeholder="9876543210"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
            />
            <p className="text-xs text-muted mt-1">
              You can add them later when eSign goes live.
            </p>
          </div>

          <div className="border-t border-line my-5 pt-5">
            <label className="label">Your UPI ID for repayment — optional</label>
            <input
              className="input"
              placeholder="yourname@oksbi"
              value={upiVpa}
              onChange={(e) => setUpiVpa(e.target.value)}
            />
            <p className="text-xs text-muted mt-1 leading-relaxed">
              If set, the reminder email on the due date includes a one-tap "Pay via UPI"
              button — opens GPay / PhonePe / Paytm with the amount pre-filled. Free, no signup
              needed from them.
            </p>
          </div>

          <button
            className="btn btn-big"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Saving…' : 'Save draft + join waitlist'}
          </button>

          {error && <div className="text-danger text-sm text-center mt-3">{error}</div>}

          <div className="text-xs text-muted text-center mt-4">
            By submitting, you agree to be contacted about ShakeOnIt eSign launch. We don't share your details.
          </div>
        </section>
      </div>
    );
  }

  // ============ DONE STEP ============
  if (step === 'done') {
    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="text-center text-muted text-sm mb-6">You're on the list</div>
        <section className="card text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold mb-2">You&apos;re in!</h1>
          <p className="text-muted mb-5">
            {waitlistPos !== null
              ? `You're #${waitlistPos} on the eSign waitlist. We'll email ${creatorEmail} when Aadhaar signing goes live.`
              : `Your draft is saved. We'll email ${creatorEmail} when Aadhaar eSign launches.`}
          </p>
          <div className="bg-bg border border-line rounded-xl p-4 text-sm text-left mb-5">
            <div className="text-xs uppercase tracking-wider text-muted mb-1">Your draft</div>
            <div className="font-semibold mb-1">{TEMPLATE_META[contract!.type].label}</div>
            <div className="text-xs text-muted">Saved · We'll bring it up when eSign goes live</div>
          </div>

          <div className="space-y-2">
            {waitlistId && (
              <Link
                href={`/pro/esign/${waitlistId}`}
                className="btn block text-center !bg-good"
                style={{ color: '#0f0e17' }}
              >
                ✍️ Try Demo eSign now →
              </Link>
            )}
            <Link href="/pinky" className="btn btn-secondary block text-center">
              Make a free pinky promise meanwhile
            </Link>
            <Link href="/" className="btn btn-secondary block text-center">
              Back to home
            </Link>
          </div>
          <p className="text-xs text-muted text-center mt-3">
            Demo eSign needs login (phone OTP). Drafts stay in your dashboard once you're signed in.
          </p>
        </section>
      </div>
    );
  }

  return null;
}

// ============ TEMPLATE FORMS ============

function LoanForm({ onDraft }: { onDraft: (c: Contract) => void }) {
  const [lenderName, setLenderName] = useState('');
  const [borrowerName, setBorrowerName] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [repayMode, setRepayMode] = useState<'lump' | 'installments'>('lump');
  const [installments, setInstallments] = useState('3');
  const [error, setError] = useState('');

  const submit = () => {
    const amt = parseFloat(amount);
    if (!lenderName.trim() || !borrowerName.trim() || !purpose.trim() || !dueDate || !amount) {
      setError('Fill in all fields.');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setError('Amount must be a positive number.');
      return;
    }
    setError('');
    const c: LoanContract = {
      type: 'loan',
      lenderName: lenderName.trim(),
      borrowerName: borrowerName.trim(),
      amountPaise: Math.round(amt * 100),
      purpose: purpose.trim(),
      dueDate,
      repayMode,
      ...(repayMode === 'installments' ? { installments: parseInt(installments) || 3 } : {}),
    };
    onDraft(c);
  };

  return (
    <>
      <label className="label">Lender's full name</label>
      <input className="input" value={lenderName} onChange={(e) => setLenderName(e.target.value)} placeholder="As on Aadhaar" />

      <label className="label mt-4">Borrower's full name</label>
      <input className="input" value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} placeholder="As on Aadhaar" />

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div>
          <label className="label">Amount (₹)</label>
          <input className="input" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" />
        </div>
        <div>
          <label className="label">Repay by</label>
          <input className="input" type="date" min={new Date().toISOString().slice(0, 10)} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>

      <label className="label mt-4">Purpose of loan</label>
      <input className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. medical emergency, business capital" />

      <label className="label mt-4">Repayment mode</label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setRepayMode('lump')}
          className={`btn ${repayMode === 'lump' ? '' : 'btn-secondary'}`}
        >
          Lump sum
        </button>
        <button
          type="button"
          onClick={() => setRepayMode('installments')}
          className={`btn ${repayMode === 'installments' ? '' : 'btn-secondary'}`}
        >
          Installments
        </button>
      </div>

      {repayMode === 'installments' && (
        <div className="mt-3">
          <label className="label">How many installments?</label>
          <input className="input" type="number" min={2} max={36} value={installments} onChange={(e) => setInstallments(e.target.value)} />
        </div>
      )}

      <button className="btn btn-big mt-6" onClick={submit}>
        Preview draft →
      </button>
      {error && <div className="text-danger text-sm text-center mt-3">{error}</div>}
    </>
  );
}

function ExpenseForm({ onDraft }: { onDraft: (c: Contract) => void }) {
  const [billName, setBillName] = useState('');
  const [total, setTotal] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [notes, setNotes] = useState('');
  const [parties, setParties] = useState([
    { name: '', share: '' },
    { name: '', share: '' },
  ]);
  const [error, setError] = useState('');

  const updateParty = (i: number, key: 'name' | 'share', value: string) => {
    setParties((p) => p.map((x, idx) => (idx === i ? { ...x, [key]: value } : x)));
  };
  const addParty = () => setParties((p) => [...p, { name: '', share: '' }]);
  const removeParty = (i: number) => setParties((p) => (p.length > 2 ? p.filter((_, idx) => idx !== i) : p));

  const splitEqual = () => {
    const tot = parseFloat(total);
    if (isNaN(tot) || tot <= 0 || parties.length === 0) return;
    const each = (tot / parties.length).toFixed(2);
    setParties((p) => p.map((x) => ({ ...x, share: each })));
  };

  const submit = () => {
    const tot = parseFloat(total);
    if (!billName.trim() || !total || !dueDate) {
      setError('Bill name, total, and due date are required.');
      return;
    }
    if (isNaN(tot) || tot <= 0) {
      setError('Total must be a positive number.');
      return;
    }
    if (parties.some((p) => !p.name.trim() || !p.share)) {
      setError('Every party needs a name and share.');
      return;
    }
    const sharesSum = parties.reduce((s, p) => s + parseFloat(p.share || '0'), 0);
    if (Math.abs(sharesSum - tot) > 0.01) {
      setError(`Shares add up to ₹${sharesSum.toFixed(2)} but total is ₹${tot.toFixed(2)}.`);
      return;
    }
    setError('');
    const c: ExpenseContract = {
      type: 'expense',
      billName: billName.trim(),
      totalPaise: Math.round(tot * 100),
      parties: parties.map((p) => ({ name: p.name.trim(), sharePaise: Math.round(parseFloat(p.share) * 100) })),
      dueDate,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    onDraft(c);
  };

  return (
    <>
      <label className="label">Bill / expense name</label>
      <input className="input" value={billName} onChange={(e) => setBillName(e.target.value)} placeholder="e.g. Goa trip Nov 2026" />

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div>
          <label className="label">Total amount (₹)</label>
          <input className="input" type="number" min={1} value={total} onChange={(e) => setTotal(e.target.value)} placeholder="12000" />
        </div>
        <div>
          <label className="label">Settle by</label>
          <input className="input" type="date" min={new Date().toISOString().slice(0, 10)} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 mb-1">
        <label className="label !mb-0">Parties & shares</label>
        <button type="button" className="text-xs text-accent" onClick={splitEqual}>
          Split equally
        </button>
      </div>
      <div className="space-y-2">
        {parties.map((p, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="input flex-1"
              placeholder={`Person ${i + 1}`}
              value={p.name}
              onChange={(e) => updateParty(i, 'name', e.target.value)}
            />
            <input
              className="input w-28"
              type="number"
              placeholder="Share ₹"
              value={p.share}
              onChange={(e) => updateParty(i, 'share', e.target.value)}
            />
            {parties.length > 2 && (
              <button
                type="button"
                onClick={() => removeParty(i)}
                className="text-muted hover:text-danger px-2"
                aria-label="remove"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button type="button" className="text-sm text-accent" onClick={addParty}>
          + Add another person
        </button>
      </div>

      <label className="label mt-4">Notes (optional)</label>
      <textarea className="input min-h-[60px]" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any extra context" />

      <button className="btn btn-big mt-6" onClick={submit}>
        Preview draft →
      </button>
      {error && <div className="text-danger text-sm text-center mt-3">{error}</div>}
    </>
  );
}

function ServiceForm({ onDraft }: { onDraft: (c: Contract) => void }) {
  const [providerName, setProviderName] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [task, setTask] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [compensation, setCompensation] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (!providerName.trim() || !recipientName.trim() || !task.trim() || !dueDate) {
      setError('Fill in all required fields.');
      return;
    }
    const comp = compensation ? parseFloat(compensation) : 0;
    if (compensation && (isNaN(comp) || comp < 0)) {
      setError('Compensation must be 0 or a positive number.');
      return;
    }
    setError('');
    const c: ServiceContract = {
      type: 'service',
      providerName: providerName.trim(),
      recipientName: recipientName.trim(),
      task: task.trim(),
      dueDate,
      ...(comp > 0 ? { compensationPaise: Math.round(comp * 100) } : {}),
    };
    onDraft(c);
  };

  return (
    <>
      <label className="label">Service provider (who's delivering?)</label>
      <input className="input" value={providerName} onChange={(e) => setProviderName(e.target.value)} placeholder="Full name" />

      <label className="label mt-4">Recipient (who's receiving?)</label>
      <input className="input" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Full name" />

      <label className="label mt-4">What's being delivered?</label>
      <textarea className="input min-h-[80px]" value={task} onChange={(e) => setTask(e.target.value)} placeholder="e.g. logo design — 3 concepts + 2 revisions" />

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div>
          <label className="label">Deliver by</label>
          <input className="input" type="date" min={new Date().toISOString().slice(0, 10)} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Payment (₹) — optional</label>
          <input className="input" type="number" min={0} value={compensation} onChange={(e) => setCompensation(e.target.value)} placeholder="0 if free" />
        </div>
      </div>

      <button className="btn btn-big mt-6" onClick={submit}>
        Preview draft →
      </button>
      {error && <div className="text-danger text-sm text-center mt-3">{error}</div>}
    </>
  );
}

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

export default function ProNewPage() {
  return (
    <Suspense fallback={<div className="text-center text-muted p-12">Loading…</div>}>
      <ProNewInner />
    </Suspense>
  );
}
