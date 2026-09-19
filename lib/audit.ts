import { Prisma, AuditAction } from '@prisma/client';

export interface CreateAuditEventParams {
  firmId: string;
  documentId: string;
  actorId: string;
  action: AuditAction;
  comment?: string | null;
}

/**
 * Audit Event Helper
 * Ensures audit events are written transactionally alongside document mutations.
 */
export async function createAuditEventInTx(
  tx: Prisma.TransactionClient,
  params: CreateAuditEventParams
) {
  return tx.auditEvent.create({
    data: {
      firmId: params.firmId,
      documentId: params.documentId,
      actorId: params.actorId,
      action: params.action,
      comment: params.comment || null,
    },
  });
}
