import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession, isValidPhone, normalizePhone, setSessionCookie, DEMO_OTP_CODE, DEMO_OTP_ENABLED } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { phone, code, name } = await req.json();
    if (!phone || !code || !isValidPhone(phone)) {
      return NextResponse.json({ error: 'invalid input' }, { status: 400 });
    }
    const normalized = normalizePhone(phone);
    const cleanCode = String(code).trim();

    // Accept demo code always when demo is on; otherwise look up a real, unconsumed code.
    let ok = false;
    if (DEMO_OTP_ENABLED && cleanCode === DEMO_OTP_CODE) {
      ok = true;
    } else {
      const otp = await prisma.otpCode.findFirst({
        where: {
          phone: normalized,
          code: cleanCode,
          consumed: false,
          expiresAt: { gt: new Date() },
        },
      });
      if (otp) {
        await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });
        ok = true;
      }
    }

    if (!ok) return NextResponse.json({ error: 'invalid or expired code' }, { status: 400 });

    // Upsert user
    const user = await prisma.user.upsert({
      where: { phone: normalized },
      update: name ? { name } : {},
      create: { phone: normalized, name: name ?? null },
    });

    const token = await createSession(user.id);
    await setSessionCookie(token);

    return NextResponse.json({
      ok: true,
      user: { id: user.id, phone: user.phone, name: user.name },
    });
  } catch (e) {
    console.error('auth/verify failed', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
