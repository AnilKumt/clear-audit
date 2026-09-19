import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionOrThrow, requireRole, AuthError } from '@/lib/auth';
import { prisma, scopedPrisma } from '@/lib/db';
import { Role, AuditAction } from '@prisma/client';
import { assertValidTransition, TransitionError } from '@/lib/transitions';
import { createAuditEventInTx } from '@/lib/audit';

const requestCorrectionSchema = z.object({
  comment: z.string().min(1, 'Correction reason is required and cannot be empty.'),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionOrThrow(req);
    requireRole(session, [Role.REVIEWER, Role.PARTNER]);

    const { id: documentId } = await params;
    const db = scopedPrisma(session.firmId);

    const existingDoc = await db.document.findFirst({
      where: { id: documentId },
    });

    if (!existingDoc || existingDoc.firmId !== session.firmId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const body = await req.json();
    const parseResult = requestCorrectionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { comment } = parseResult.data;

    const nextStatus = assertValidTransition(
      existingDoc.status,
      AuditAction.CORRECTION_REQUESTED
    );

    const updatedDocument = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.update({
        where: { id: documentId },
        data: {
          status: nextStatus,
          reviewComment: comment,
        },
      });

      await createAuditEventInTx(tx, {
        firmId: session.firmId,
        documentId,
        actorId: session.userId,
        action: AuditAction.CORRECTION_REQUESTED,
        comment,
      });

      return doc;
    });

    return NextResponse.json({ document: updatedDocument });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    if (err instanceof TransitionError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
