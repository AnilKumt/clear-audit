import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionOrThrow, requireRole, AuthError } from '@/lib/auth';
import { prisma, scopedPrisma } from '@/lib/db';
import { Role, DocumentStatus, AuditAction } from '@prisma/client';
import { createAuditEventInTx } from '@/lib/audit';

const createDocumentSchema = z.object({
  name: z.string().min(1, 'Document name is required').max(150),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionOrThrow(req);
    const { id: clientId } = await params;
    const db = scopedPrisma(session.firmId);

    // Defense-in-depth: check client ownership
    const client = await db.client.findFirst({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const documents = await db.document.findMany({
      where: { clientId },
      orderBy: { updatedAt: 'desc' },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          select: {
            id: true,
            versionNumber: true,
            fileName: true,
            uploadedAt: true,
            uploadedBy: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ client, documents });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionOrThrow(req);
    requireRole(session, [Role.STAFF, Role.PARTNER]);

    const { id: clientId } = await params;
    const db = scopedPrisma(session.firmId);

    // Defense-in-depth check
    const client = await db.client.findFirst({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const body = await req.json();
    const parseResult = createDocumentSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    // Atomic transaction: Create document + write DOCUMENT_REQUIREMENT_ADDED audit event
    const document = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          name: parseResult.data.name,
          status: DocumentStatus.PENDING,
          clientId: client.id,
          firmId: session.firmId,
        },
      });

      await createAuditEventInTx(tx, {
        firmId: session.firmId,
        documentId: doc.id,
        actorId: session.userId,
        action: AuditAction.DOCUMENT_REQUIREMENT_ADDED,
        comment: `Required document added: ${doc.name}`,
      });

      return doc;
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
