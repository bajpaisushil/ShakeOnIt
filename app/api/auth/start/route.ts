import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { DEMO_OTP_CODE, DEMO_OTP_ENABLED, generateOtp, isValidPhone, normalizePhone } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json({ error: 'invalid phone' }, { status: 400 });
    }
    const normalized = normalizePhone(phone);
    const code = DEMO_OTP_ENABLED ? DEMO_OTP_CODE : generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Invalidate previous unused codes for this phone
    await prisma.otpCode.updateMany({
      where: { phone: normalized, consumed: false },
      data: { consumed: true },
    });
    await prisma.otpCode.create({ data: { phone: normalized, code, expiresAt } });

    // In demo mode we tell the client the code so they don't get stuck.
    // In production, this branch is removed and SMS is sent via lib/sms.ts.
    return NextResponse.json({
      ok: true,
      demo: DEMO_OTP_ENABLED,
      demoCode: DEMO_OTP_ENABLED ? code : undefined,
    });
  } catch (e) {
    console.error('auth/start failed', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
