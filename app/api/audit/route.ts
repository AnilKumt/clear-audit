import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrThrow, requireRole, AuthError } from '@/lib/auth';
import { scopedPrisma } from '@/lib/db';
import { Role } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow(req);
    requireRole(session, [Role.REVIEWER, Role.PARTNER]);

    const db = scopedPrisma(session.firmId);

    const auditEvents = await db.auditEvent.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: { id: true, name: true, role: true, email: true },
        },
        document: {
          select: {
            id: true,
            name: true,
            status: true,
            client: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ auditEvents });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
