import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrThrow, AuthError } from '@/lib/auth';
import { scopedPrisma } from '@/lib/db';
import { Role, DocumentStatus } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionOrThrow(req);
    const { id: documentId } = await params;
    const db = scopedPrisma(session.firmId);

    const document = await db.document.findFirst({
      where: { id: documentId },
      include: {
        client: {
          select: { id: true, name: true },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            uploadedBy: {
              select: { id: true, name: true, role: true, email: true },
            },
          },
        },
        auditEvents: {
          orderBy: { createdAt: 'asc' },
          include: {
            actor: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    // Defense-in-depth: explicit ownership check (returns 404 to avoid data leakage)
    if (!document || document.firmId !== session.firmId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Compute available actions for the current user's role and document status
    const isStaffOrPartner = session.role === Role.STAFF || session.role === Role.PARTNER;
    const isReviewerOrPartner = session.role === Role.REVIEWER || session.role === Role.PARTNER;

    const availableActions = {
      canUpload: isStaffOrPartner && (
        document.status === DocumentStatus.PENDING ||
        document.status === DocumentStatus.CORRECTION_REQUIRED
      ),
      canStartReview: isReviewerOrPartner && document.status === DocumentStatus.UPLOADED,
      canApprove: isReviewerOrPartner && document.status === DocumentStatus.UNDER_REVIEW,
      canRequestCorrection: isReviewerOrPartner && document.status === DocumentStatus.UNDER_REVIEW,
    };

    return NextResponse.json({
      document,
      availableActions,
    });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
