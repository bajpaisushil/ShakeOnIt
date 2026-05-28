// Pro-tier contract templates. Each renders a deterministic legal-prose draft
// for review before the user hits "send for signing". Templates intentionally
// avoid lawyer-bait (no warranties, no jurisdiction clauses) — keeping them
// neutral enough that a lawyer review per launch covers them all at once.

export type LoanContract = {
  type: 'loan';
  lenderName: string;
  borrowerName: string;
  amountPaise: number;
  purpose: string;
  dueDate: string;        // YYYY-MM-DD
  repayMode: 'lump' | 'installments';
  installments?: number;
};

export type ExpenseContract = {
  type: 'expense';
  billName: string;
  totalPaise: number;
  parties: { name: string; sharePaise: number }[];
  dueDate: string;
  notes?: string;
};

export type ServiceContract = {
  type: 'service';
  providerName: string;
  recipientName: string;
  task: string;
  dueDate: string;
  compensationPaise?: number;
};

export type Contract = LoanContract | ExpenseContract | ServiceContract;

function rupees(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(paise / 100);
}

function longDate(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function renderContract(c: Contract): string {
  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  switch (c.type) {
    case 'loan':
      return [
        `PERSONAL LOAN AGREEMENT`,
        ``,
        `This agreement is made on ${today} between:`,
        ``,
        `  LENDER:   ${c.lenderName}`,
        `  BORROWER: ${c.borrowerName}`,
        ``,
        `1. The Lender has lent ${rupees(c.amountPaise)} to the Borrower for the purpose of: ${c.purpose}.`,
        ``,
        `2. The Borrower agrees to repay the said sum by ${longDate(c.dueDate)}${
          c.repayMode === 'installments' && c.installments
            ? `, in ${c.installments} equal installments`
            : ''
        }.`,
        ``,
        `3. No interest is charged on this loan unless otherwise agreed in writing.`,
        ``,
        `4. Both parties acknowledge this is a personal loan between individuals, signed digitally via ShakeOnIt and bound by the Indian Contract Act, 1872.`,
      ].join('\n');

    case 'expense':
      return [
        `SHARED EXPENSE AGREEMENT`,
        ``,
        `This agreement is made on ${today} for the expense: "${c.billName}".`,
        ``,
        `Total amount: ${rupees(c.totalPaise)}`,
        ``,
        `The following parties agree to bear the share indicated against their name:`,
        ``,
        ...c.parties.map((p, i) => `  ${i + 1}. ${p.name} — ${rupees(p.sharePaise)}`),
        ``,
        `Each party agrees to settle their share by ${longDate(c.dueDate)}.`,
        c.notes ? `\nNotes: ${c.notes}` : '',
        ``,
        `Signed digitally via ShakeOnIt under the Indian Contract Act, 1872.`,
      ].filter(Boolean).join('\n');

    case 'service':
      return [
        `SERVICE / TASK DELIVERY AGREEMENT`,
        ``,
        `This agreement is made on ${today} between:`,
        ``,
        `  PROVIDER:  ${c.providerName}`,
        `  RECIPIENT: ${c.recipientName}`,
        ``,
        `1. The Provider agrees to deliver the following to the Recipient: ${c.task}.`,
        ``,
        `2. Delivery shall be completed by ${longDate(c.dueDate)}.`,
        ``,
        c.compensationPaise && c.compensationPaise > 0
          ? `3. The Recipient agrees to pay the Provider ${rupees(c.compensationPaise)} upon completion.`
          : `3. No monetary compensation is involved in this agreement.`,
        ``,
        `Signed digitally via ShakeOnIt under the Indian Contract Act, 1872.`,
      ].join('\n');
  }
}

export const TEMPLATE_META = {
  loan: {
    label: 'Personal Loan / IOU',
    emoji: '💰',
    blurb: 'Lend money to a friend with a clear repayment date.',
  },
  expense: {
    label: 'Shared Expense Split',
    emoji: '🧾',
    blurb: 'Rent, road trip, group dinner — split it fairly.',
  },
  service: {
    label: 'Promise to Deliver',
    emoji: '🛠️',
    blurb: 'Freelance task, errand, or favor with a deadline.',
  },
} as const;
