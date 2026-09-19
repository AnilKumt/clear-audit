import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionOrThrow, requireRole, AuthError } from '@/lib/auth';
import { scopedPrisma } from '@/lib/db';
import { Role } from '@prisma/client';

const createClientSchema = z.object({
  name: z.string().min(1, 'Client name is required').max(100),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionOrThrow(req);
    const db = scopedPrisma(session.firmId);

    const clients = await db.client.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        documents: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({ clients });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionOrThrow(req);
    requireRole(session, [Role.STAFF, Role.PARTNER]);

    const body = await req.json();
    const parseResult = createClientSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const db = scopedPrisma(session.firmId);

    const client = await db.client.create({
      name: parseResult.data.name,
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
