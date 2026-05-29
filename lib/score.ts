// Promise-keeping score. Starts at 100, drops on overdue contracts.
// Rule of thumb (tunable):
//   - settled by due date     → no change
//   - settled within 7 days late → -5
//   - 7-30 days overdue        → -15
//   - 30+ days overdue          → -30 + posted to public wall (anonymized)
// Score floors at 0; never goes above 100.

import { prisma } from './db';

export type ScoreImpact = {
  delta: number;
  reason: string;
  postToWall: boolean;
};

export function impactForOverdue(daysOverdue: number): ScoreImpact {
  if (daysOverdue <= 0) {
    return { delta: 0, reason: 'on time', postToWall: false };
  }
  if (daysOverdue <= 7) {
    return { delta: -5, reason: `1-7 days overdue`, postToWall: false };
  }
  if (daysOverdue <= 30) {
    return { delta: -15, reason: `${daysOverdue} days overdue`, postToWall: false };
  }
  return { delta: -30, reason: `${daysOverdue}+ days overdue (broken promise)`, postToWall: true };
}

export async function adjustScore(userId: string, delta: number) {
  if (delta === 0) return;
  // Atomic min/max via raw SQL — clamp to [0, 100]
  await prisma.$executeRaw`
    UPDATE "User"
    SET "promiseScore" = GREATEST(0, LEAST(100, "promiseScore" + ${delta}))
    WHERE id = ${userId}
  `;
}

export function scoreBand(score: number): { label: string; emoji: string; cls: string } {
  if (score >= 90) return { label: 'Rock solid', emoji: '🟢', cls: 'text-good' };
  if (score >= 70) return { label: 'Reliable', emoji: '🟡', cls: 'text-accent' };
  if (score >= 50) return { label: 'Patchy', emoji: '🟠', cls: 'text-accent' };
  if (score >= 30) return { label: 'Shaky', emoji: '🔴', cls: 'text-danger' };
  return { label: 'Broken-promise zone', emoji: '⚠️', cls: 'text-danger' };
}
