// Renders a printable "signed contract" HTML page. Used by the demo eSign flow.
// In production, this gets replaced by the PKCS#7-signed PDF that Digio/Leegality returns.

export type SignedRender = {
  draftText: string;
  signerName: string;
  signerPhone: string;
  counterpartyName?: string;
  signedAt: Date;
  signatureHash: string;
  contractId: string;
  isDemo: boolean;
};

export function renderSignedContractHTML(r: SignedRender): string {
  const dateStr = r.signedAt.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Signed Contract — ShakeOnIt #${r.contractId.slice(-8).toUpperCase()}</title>
<style>
  @page { size: A4; margin: 24mm 18mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.55; max-width: 720px; margin: 0 auto; padding: 24px; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 24px; }
  .logo { font-weight: 800; font-size: 18px; letter-spacing: -0.01em; font-family: -apple-system, sans-serif; }
  .meta { font-size: 11px; color: #666; text-align: right; font-family: ui-monospace, monospace; }
  pre { font-family: Georgia, serif; white-space: pre-wrap; font-size: 13px; }
  .demo-banner { background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 10px 14px; margin: 16px 0; font-size: 12px; color: #664d03; }
  .sigblock { border: 1px solid #1a1a1a; border-radius: 6px; padding: 18px; margin-top: 32px; background: #fafafa; }
  .sigblock h3 { margin: 0 0 12px; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #666; font-family: -apple-system, sans-serif; }
  .sig-name { font-size: 22px; font-family: 'Brush Script MT', 'Comic Sans MS', cursive; color: #00367e; padding: 8px 0; border-bottom: 1px solid #ccc; }
  .sig-details { font-size: 11px; color: #666; margin-top: 8px; font-family: ui-monospace, monospace; line-height: 1.6; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center; font-family: ui-monospace, monospace; }
  .actions { padding: 12px; background: #f0f0f0; border-radius: 6px; margin-bottom: 24px; display: flex; gap: 8px; }
  .actions button { background: #00367e; color: #fff; border: none; padding: 8px 14px; border-radius: 4px; font-size: 13px; cursor: pointer; font-family: -apple-system, sans-serif; }
  @media print { .actions { display: none; } }
</style>
</head>
<body>
  <div class="actions">
    <button onclick="window.print()">🖨️ Print / Save as PDF</button>
    <button onclick="window.close()">Close</button>
  </div>
  <div class="header">
    <div class="logo">🤝 ShakeOnIt</div>
    <div class="meta">
      Contract #${r.contractId.slice(-12).toUpperCase()}<br>
      Signed: ${dateStr}<br>
      Hash: ${r.signatureHash}
    </div>
  </div>

  ${r.isDemo ? `<div class="demo-banner">
    <strong>DEMO MODE</strong> — This is a preview of the eSign UX.
    Real Aadhaar eSign launches once the production aggregator integration completes.
    This document is NOT legally binding.
  </div>` : ''}

  <pre>${escapeHTML(r.draftText)}</pre>

  <div class="sigblock">
    <h3>Digital Signature</h3>
    <div class="sig-name">${escapeHTML(r.signerName)}</div>
    <div class="sig-details">
      Signer name (as on Aadhaar): ${escapeHTML(r.signerName)}<br>
      Phone (OTP verified): +91-${escapeHTML(r.signerPhone)}<br>
      Signed via: ShakeOnIt ${r.isDemo ? 'Demo eSign' : 'Aadhaar eSign'}<br>
      Timestamp (IST): ${dateStr}<br>
      Signature hash (SHA-256): ${r.signatureHash}<br>
      ${r.counterpartyName ? `Counterparty: ${escapeHTML(r.counterpartyName)}<br>` : ''}
    </div>
  </div>

  <div class="footer">
    Issued by ShakeOnIt · ${r.isDemo ? 'Demo signing for UX preview' : 'Aadhaar eSigned under IT Act § 5'} · Verify authenticity at shakeonit.app/verify/${r.contractId}
  </div>
</body>
</html>`;
}

function escapeHTML(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
