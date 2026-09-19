import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Tenant Isolation Helper: scopedPrisma(firmId)
 * 
 * Provides centrally firm-scoped data access for multi-tenant security.
 * By wrapping Prisma queries with session.firmId, every query automatically
 * enforces tenant boundaries on Client, Document, DocumentVersion, and AuditEvent models.
 * 
 * This ensures developers cannot accidentally omit `firmId` filtering in individual API routes.
 */
export function scopedPrisma(firmId: string) {
  return {
    firmId,
    // Client queries strictly scoped to firmId
    client: {
      findMany: <T extends Prisma.ClientFindManyArgs>(args: Prisma.SelectSubset<T, Prisma.ClientFindManyArgs> = {} as any) => {
        const queryArgs = (args || {}) as Prisma.ClientFindManyArgs;
        return prisma.client.findMany({
          ...queryArgs,
          where: { ...(queryArgs.where || {}), firmId },
        });
      },
      findFirst: <T extends Prisma.ClientFindFirstArgs>(args: Prisma.SelectSubset<T, Prisma.ClientFindFirstArgs> = {} as any) => {
        const queryArgs = (args || {}) as Prisma.ClientFindFirstArgs;
        return prisma.client.findFirst({
          ...queryArgs,
          where: { ...(queryArgs.where || {}), firmId },
        });
      },
      create: (data: { name: string }) =>
        prisma.client.create({
          data: { ...data, firmId },
        }),
      count: <T extends Prisma.ClientCountArgs>(args: Prisma.SelectSubset<T, Prisma.ClientCountArgs> = {} as any) => {
        const queryArgs = (args || {}) as Prisma.ClientCountArgs;
        return prisma.client.count({
          ...queryArgs,
          where: { ...(queryArgs.where || {}), firmId },
        });
      },
    },
    // Document queries strictly scoped to firmId
    document: {
      findMany: <T extends Prisma.DocumentFindManyArgs>(args: Prisma.SelectSubset<T, Prisma.DocumentFindManyArgs> = {} as any) => {
        const queryArgs = (args || {}) as Prisma.DocumentFindManyArgs;
        return prisma.document.findMany({
          ...queryArgs,
          where: { ...(queryArgs.where || {}), firmId },
        });
      },
      findFirst: <T extends Prisma.DocumentFindFirstArgs>(args: Prisma.SelectSubset<T, Prisma.DocumentFindFirstArgs> = {} as any) => {
        const queryArgs = (args || {}) as Prisma.DocumentFindFirstArgs;
        return prisma.document.findFirst({
          ...queryArgs,
          where: { ...(queryArgs.where || {}), firmId },
        });
      },
      create: (data: { name: string; clientId: string; status?: Prisma.DocumentCreateInput['status']; reviewComment?: string | null }) =>
        prisma.document.create({
          data: { ...data, firmId },
        }),
      count: <T extends Prisma.DocumentCountArgs>(args: Prisma.SelectSubset<T, Prisma.DocumentCountArgs> = {} as any) => {
        const queryArgs = (args || {}) as Prisma.DocumentCountArgs;
        return prisma.document.count({
          ...queryArgs,
          where: { ...(queryArgs.where || {}), firmId },
        });
      },
    },
    // DocumentVersion queries strictly scoped via parent Document's firmId
    documentVersion: {
      findMany: <T extends Prisma.DocumentVersionFindManyArgs>(args: Prisma.SelectSubset<T, Prisma.DocumentVersionFindManyArgs> = {} as any) => {
        const queryArgs = (args || {}) as Prisma.DocumentVersionFindManyArgs;
        return prisma.documentVersion.findMany({
          ...queryArgs,
          where: {
            ...(queryArgs.where || {}),
            document: { firmId },
          },
        });
      },
      findFirst: <T extends Prisma.DocumentVersionFindFirstArgs>(args: Prisma.SelectSubset<T, Prisma.DocumentVersionFindFirstArgs> = {} as any) => {
        const queryArgs = (args || {}) as Prisma.DocumentVersionFindFirstArgs;
        return prisma.documentVersion.findFirst({
          ...queryArgs,
          where: {
            ...(queryArgs.where || {}),
            document: { firmId },
          },
        });
      },
    },
    // AuditEvent queries strictly scoped to firmId
    auditEvent: {
      findMany: <T extends Prisma.AuditEventFindManyArgs>(args: Prisma.SelectSubset<T, Prisma.AuditEventFindManyArgs> = {} as any) => {
        const queryArgs = (args || {}) as Prisma.AuditEventFindManyArgs;
        return prisma.auditEvent.findMany({
          ...queryArgs,
          where: { ...(queryArgs.where || {}), firmId },
        });
      },
      findFirst: <T extends Prisma.AuditEventFindFirstArgs>(args: Prisma.SelectSubset<T, Prisma.AuditEventFindFirstArgs> = {} as any) => {
        const queryArgs = (args || {}) as Prisma.AuditEventFindFirstArgs;
        return prisma.auditEvent.findFirst({
          ...queryArgs,
          where: { ...(queryArgs.where || {}), firmId },
        });
      },
      create: (data: { documentId: string; actorId: string; action: Prisma.AuditEventCreateInput['action']; comment?: string | null }) =>
        prisma.auditEvent.create({
          data: { ...data, firmId },
        }),
    },
  };
}
