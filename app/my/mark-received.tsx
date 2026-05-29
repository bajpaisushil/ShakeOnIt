'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MarkReceived({ contractId }: { contractId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (busy) return;
    if (!window.confirm('Confirm you received the payment? This settles the contract.')) return;
    setBusy(true);
    try {
      await fetch(`/api/contract/${contractId}/mark-received`, { method: 'POST' });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={confirm}
      disabled={busy}
      className="btn !w-auto !py-2 !px-4 text-sm"
    >
      {busy ? 'Confirming…' : '✓ Mark as received'}
    </button>
  );
}
