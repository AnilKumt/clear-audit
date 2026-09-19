import { DocumentStatus, AuditAction } from '@prisma/client';

export class TransitionError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'TransitionError';
    this.statusCode = statusCode;
  }
}

/**
 * Validates status state machine transitions server-side.
 * 
 * State machine rules:
 * - PENDING + DOCUMENT_UPLOADED -> UPLOADED
 * - UPLOADED + REVIEW_STARTED -> UNDER_REVIEW
 * - UNDER_REVIEW + DOCUMENT_APPROVED -> APPROVED (terminal)
 * - UNDER_REVIEW + CORRECTION_REQUESTED -> CORRECTION_REQUIRED
 * - CORRECTION_REQUIRED + DOCUMENT_UPLOADED -> UPLOADED (loops back)
 * 
 * Returns the target status if valid, or throws a TransitionError (400) if invalid.
 */
export function assertValidTransition(
  currentStatus: DocumentStatus,
  action: AuditAction
): DocumentStatus {
  switch (currentStatus) {
    case DocumentStatus.PENDING:
      if (action === AuditAction.DOCUMENT_UPLOADED) {
        return DocumentStatus.UPLOADED;
      }
      break;

    case DocumentStatus.UPLOADED:
      if (action === AuditAction.REVIEW_STARTED) {
        return DocumentStatus.UNDER_REVIEW;
      }
      break;

    case DocumentStatus.UNDER_REVIEW:
      if (action === AuditAction.DOCUMENT_APPROVED) {
        return DocumentStatus.APPROVED;
      }
      if (action === AuditAction.CORRECTION_REQUESTED) {
        return DocumentStatus.CORRECTION_REQUIRED;
      }
      break;

    case DocumentStatus.CORRECTION_REQUIRED:
      if (action === AuditAction.DOCUMENT_UPLOADED) {
        return DocumentStatus.UPLOADED;
      }
      break;

    case DocumentStatus.APPROVED:
      throw new TransitionError(
        'Document is in terminal APPROVED state and cannot undergo further state changes.',
        400
      );

    default:
      break;
  }

  throw new TransitionError(
    `Invalid status transition: Action '${action}' is not allowed for document in status '${currentStatus}'.`,
    400
  );
}
