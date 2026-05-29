import { prisma } from './db';

export type SuspendableUser = {
  id: string;
  suspendedAt: Date | null;
  suspensionReason: string | null;
  outstandingPaise: number;
};

export function isSuspended(u: SuspendableUser | null | undefined): boolean {
  return Boolean(u?.suspendedAt);
}

// Suspend a user. Called when a mandate debit fails.
// Outstanding is what they need to pay to reactivate.
export async function suspendUser(userId: string, outstandingPaise: number, reason: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      suspendedAt: new Date(),
      suspensionReason: reason,
      outstandingPaise: { increment: outstandingPaise },
    },
  });
}

// Lift suspension after the outstanding is settled.
export async function reactivateUser(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      suspendedAt: null,
      suspensionReason: null,
      outstandingPaise: 0,
    },
  });
}
