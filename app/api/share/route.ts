import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Posts an anonymized promise to the public wall.
// Called from /pinky create (when user opts in) and /pinky view (when agreed).

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { kind, blurb, amount, agreed } = body;

    if (!kind || !blurb) {
      return NextResponse.json({ error: 'missing kind or blurb' }, { status: 400 });
    }

    const entry = await prisma.publicPromise.create({
      data: {
        kind: String(kind).slice(0, 20),
        blurb: String(blurb).slice(0, 200),
        amount: typeof amount === 'number' ? amount : null,
        agreedAt: agreed ? new Date() : null,
      },
    });

    return NextResponse.json({ ok: true, id: entry.id });
  } catch (e) {
    console.error('share POST failed', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
