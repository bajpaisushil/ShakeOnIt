import type { PromiseV1 } from './promise';
import { formatRupees } from './promise';

// Generate a VCALENDAR/VEVENT for the due date with a 9-hours-before alarm
// (so the reminder lands at 3pm if the event is midnight-start = previous-day's evening).
// All-day event, includes the agreement timestamp in description for evidence.

function escapeICS(s: string): string {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function buildICS(p: PromiseV1): string {
  const dueCompact = p.d.replace(/-/g, '');
  const nextDay = new Date(p.d + 'T00:00:00Z');
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const endCompact = nextDay.toISOString().slice(0, 10).replace(/-/g, '');

  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const uid = `${stamp}-${Math.random().toString(36).slice(2, 10)}@shakeonit`;

  const amt = p.a ? ` (${formatRupees(p.a)})` : '';
  const summary = `🤝 ${p.f} → ${p.t}: ${p.w}${amt}`;

  const desc = [
    `${p.f} promised ${p.t}:`,
    p.w,
    p.a ? `Amount: ${formatRupees(p.a)}` : '',
    p.u ? `Pay via UPI: ${p.u}` : '',
    '',
    `Agreed via ShakeOnIt on ${now.toISOString().slice(0, 19).replace('T', ' ')} UTC.`,
  ].filter(Boolean).join('\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ShakeOnIt//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${dueCompact}`,
    `DTEND;VALUE=DATE:${endCompact}`,
    `SUMMARY:${escapeICS(summary)}`,
    `DESCRIPTION:${escapeICS(desc)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:ShakeOnIt reminder',
    'TRIGGER:-PT9H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadICS(p: PromiseV1): void {
  const ics = buildICS(p);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safe = (s: string) => s.replace(/[^a-z0-9\-]/gi, '_');
  a.download = `shakeonit-${safe(p.f)}-${safe(p.t)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
