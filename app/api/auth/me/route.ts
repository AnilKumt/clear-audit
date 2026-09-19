import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrThrow, AuthError } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow(req);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { firm: true },
    });

    if (!user || user.firmId !== session.firmId) {
      return NextResponse.json({ error: 'User session not found' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        firmId: user.firmId,
        firmName: user.firm.name,
      },
    });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
