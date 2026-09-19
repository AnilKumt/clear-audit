import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionOrThrow, requireRole, AuthError } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role, AuditAction } from '@prisma/client';
import { assertValidTransition, TransitionError } from '@/lib/transitions';
import { createAuditEventInTx } from '@/lib/audit';

const uploadSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileData: z.string().min(1, 'File data is required'), // base64 string
});

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionOrThrow(req);
    requireRole(session, [Role.STAFF, Role.PARTNER]);

    const { id: documentId } = await params;

    // Defense-in-depth: explicit firm check
    const existingDoc = await prisma.document.findFirst({
      where: { id: documentId, firmId: session.firmId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });

    if (!existingDoc || existingDoc.firmId !== session.firmId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const body = await req.json();
    const parseResult = uploadSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const { fileName, fileData } = parseResult.data;

    // Validate 5MB server-side size limit on Base64 string payload
    const base64Clean = fileData.includes(',') ? fileData.split(',')[1] : fileData;
    const estimatedSizeBytes = Math.ceil((base64Clean.length * 3) / 4);

    if (estimatedSizeBytes > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File size exceeds the hard limit of 5MB.' },
        { status: 400 }
      );
    }

    // Validate status machine transition
    const nextStatus = assertValidTransition(
      existingDoc.status,
      AuditAction.DOCUMENT_UPLOADED
    );

    const nextVersionNumber = (existingDoc.versions[0]?.versionNumber || 0) + 1;

    // Execute status change, document version creation, and audit event atomically in transaction
    const result = await prisma.$transaction(async (tx) => {
      const version = await tx.documentVersion.create({
        data: {
          documentId,
          versionNumber: nextVersionNumber,
          fileName,
          fileData: base64Clean,
          uploadedById: session.userId,
        },
      });

      const updatedDocument = await tx.document.update({
        where: { id: documentId },
        data: {
          status: nextStatus,
          reviewComment: null, // clear old correction comment on re-upload
        },
      });

      await createAuditEventInTx(tx, {
        firmId: session.firmId,
        documentId,
        actorId: session.userId,
        action: AuditAction.DOCUMENT_UPLOADED,
        comment: `Uploaded version ${nextVersionNumber} (${fileName})`,
      });

      return { document: updatedDocument, version };
    });

    return NextResponse.json(result);
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
