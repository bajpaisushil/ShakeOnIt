import { cookies } from 'next/headers';
import { randomBytes, createHash } from 'crypto';
import { prisma } from './db';

const SESSION_COOKIE = 'shake_session';
const SESSION_DAYS = 30;

// In demo mode, "000000" is always accepted as the OTP — so accounts work without SMS.
// In production, set DEMO_OTP="false" and wire an SMS provider in lib/sms.ts.
export const DEMO_OTP_CODE = '000000';
export const DEMO_OTP_ENABLED = process.env.DEMO_OTP !== 'false';

export function normalizePhone(p: string): string {
  const digits = p.replace(/\D/g, '');
  // Accept 10-digit Indian or +91 prefixed. Normalize to 10-digit.
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith('091')) return digits.slice(3);
  return digits;
}

export function isValidPhone(p: string): boolean {
  const n = normalizePhone(p);
  return /^[6-9]\d{9}$/.test(n);
}

export function generateOtp(): string {
  // Cryptographically random 6-digit code.
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function hashSig(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 32);
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { userId, token, expiresAt } });
  return token;
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const sess = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!sess || sess.expiresAt < new Date()) return null;
  return sess.user;
}

export async function requireUser() {
  const u = await getCurrentUser();
  if (!u) throw new Error('UNAUTHORIZED');
  return u;
}
