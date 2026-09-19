import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrThrow, requireRole, AuthError } from '@/lib/auth';
import { prisma, scopedPrisma } from '@/lib/db';
import { Role, AuditAction } from '@prisma/client';
import { assertValidTransition, TransitionError } from '@/lib/transitions';
import { createAuditEventInTx } from '@/lib/audit';

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

    const nextStatus = assertValidTransition(
      existingDoc.status,
      AuditAction.REVIEW_STARTED
    );

    const updatedDocument = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.update({
        where: { id: documentId },
        data: { status: nextStatus },
      });

      await createAuditEventInTx(tx, {
        firmId: session.firmId,
        documentId,
        actorId: session.userId,
        action: AuditAction.REVIEW_STARTED,
        comment: 'Review initiated by reviewer',
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
