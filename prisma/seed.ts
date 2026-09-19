import { PrismaClient, Role, DocumentStatus, AuditAction } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Tiny valid PDF header or plain base64 text for seeded files
const SAMPLE_BASE64_FILE = 'JVBERi0xLjQKJSDl4uXgzOTNMSTAKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDAKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDAKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUg==';

async function main() {
  console.log('Seeding database with multi-tenant test data...');

  // Clean existing data
  await prisma.auditEvent.deleteMany();
  await prisma.documentVersion.deleteMany();
  await prisma.document.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.firm.deleteMany();

  const commonPasswordHash = await bcrypt.hash('password123', 10);

  // -------------------------------------------------------------
  // FIRM A: ABC & Co.
  // -------------------------------------------------------------
  const firmA = await prisma.firm.create({
    data: {
      name: 'ABC & Co.',
    },
  });

  const userRohit = await prisma.user.create({
    data: {
      name: 'Rohit Sharma',
      email: 'rohit@abc.co',
      passwordHash: commonPasswordHash,
      role: Role.STAFF,
      firmId: firmA.id,
    },
  });

  const userAman = await prisma.user.create({
    data: {
      name: 'Aman Gupta',
      email: 'aman@abc.co',
      passwordHash: commonPasswordHash,
      role: Role.REVIEWER,
      firmId: firmA.id,
    },
  });

  const clientA = await prisma.client.create({
    data: {
      name: 'ABC Traders Pvt. Ltd.',
      firmId: firmA.id,
    },
  });

  // 1. Bank Statement (APPROVED with 2 versions & full audit sequence)
  const docBankStatement = await prisma.document.create({
    data: {
      name: 'Bank Statement FY 2023-24',
      status: DocumentStatus.APPROVED,
      clientId: clientA.id,
      firmId: firmA.id,
      reviewComment: null,
    },
  });

  const v1Bank = await prisma.documentVersion.create({
    data: {
      documentId: docBankStatement.id,
      versionNumber: 1,
      fileName: 'Bank_Statement_v1.pdf',
      fileData: SAMPLE_BASE64_FILE,
      uploadedById: userRohit.id,
      uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    },
  });

  const v2Bank = await prisma.documentVersion.create({
    data: {
      documentId: docBankStatement.id,
      versionNumber: 2,
      fileName: 'Bank_Statement_Reconciled_v2.pdf',
      fileData: SAMPLE_BASE64_FILE,
      uploadedById: userRohit.id,
      uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1), // 1 day ago
    },
  });

  // Audit Events sequence for Bank Statement:
  // Requirement added -> v1 uploaded -> review started -> correction requested -> v2 re-uploaded -> review started -> approved
  const now = Date.now();
  await prisma.auditEvent.createMany({
    data: [
      {
        firmId: firmA.id,
        documentId: docBankStatement.id,
        actorId: userRohit.id,
        action: AuditAction.DOCUMENT_REQUIREMENT_ADDED,
        comment: 'Requirement created for FY23-24 Bank Statement',
        createdAt: new Date(now - 1000 * 60 * 60 * 24 * 4),
      },
      {
        firmId: firmA.id,
        documentId: docBankStatement.id,
        actorId: userRohit.id,
        action: AuditAction.DOCUMENT_UPLOADED,
        comment: 'Initial upload of Bank Statement (v1)',
        createdAt: new Date(now - 1000 * 60 * 60 * 24 * 3),
      },
      {
        firmId: firmA.id,
        documentId: docBankStatement.id,
        actorId: userAman.id,
        action: AuditAction.REVIEW_STARTED,
        comment: null,
        createdAt: new Date(now - 1000 * 60 * 60 * 24 * 2.5),
      },
      {
        firmId: firmA.id,
        documentId: docBankStatement.id,
        actorId: userAman.id,
        action: AuditAction.CORRECTION_REQUESTED,
        comment: 'Missing page 4 showing closing balance reconciliation. Please re-scan and re-upload.',
        createdAt: new Date(now - 1000 * 60 * 60 * 24 * 2),
      },
      {
        firmId: firmA.id,
        documentId: docBankStatement.id,
        actorId: userRohit.id,
        action: AuditAction.DOCUMENT_UPLOADED,
        comment: 'Re-uploaded reconciled bank statement with page 4 (v2)',
        createdAt: new Date(now - 1000 * 60 * 60 * 24 * 1),
      },
      {
        firmId: firmA.id,
        documentId: docBankStatement.id,
        actorId: userAman.id,
        action: AuditAction.REVIEW_STARTED,
        comment: null,
        createdAt: new Date(now - 1000 * 60 * 60 * 12),
      },
      {
        firmId: firmA.id,
        documentId: docBankStatement.id,
        actorId: userAman.id,
        action: AuditAction.DOCUMENT_APPROVED,
        comment: 'All balances verified against general ledger. Approved.',
        createdAt: new Date(now - 1000 * 60 * 60 * 2),
      },
    ],
  });

  // 2. Sales Register (UNDER_REVIEW)
  const docSales = await prisma.document.create({
    data: {
      name: 'Sales Register Q4',
      status: DocumentStatus.UNDER_REVIEW,
      clientId: clientA.id,
      firmId: firmA.id,
    },
  });
  await prisma.documentVersion.create({
    data: {
      documentId: docSales.id,
      versionNumber: 1,
      fileName: 'Sales_Register_Q4.xlsx',
      fileData: SAMPLE_BASE64_FILE,
      uploadedById: userRohit.id,
    },
  });
  await prisma.auditEvent.createMany({
    data: [
      {
        firmId: firmA.id,
        documentId: docSales.id,
        actorId: userRohit.id,
        action: AuditAction.DOCUMENT_REQUIREMENT_ADDED,
        createdAt: new Date(now - 1000 * 60 * 60 * 48),
      },
      {
        firmId: firmA.id,
        documentId: docSales.id,
        actorId: userRohit.id,
        action: AuditAction.DOCUMENT_UPLOADED,
        createdAt: new Date(now - 1000 * 60 * 60 * 36),
      },
      {
        firmId: firmA.id,
        documentId: docSales.id,
        actorId: userAman.id,
        action: AuditAction.REVIEW_STARTED,
        createdAt: new Date(now - 1000 * 60 * 60 * 6),
      },
    ],
  });

  // 3. Purchase Register (UPLOADED)
  const docPurchase = await prisma.document.create({
    data: {
      name: 'Purchase Register Q4',
      status: DocumentStatus.UPLOADED,
      clientId: clientA.id,
      firmId: firmA.id,
    },
  });
  await prisma.documentVersion.create({
    data: {
      documentId: docPurchase.id,
      versionNumber: 1,
      fileName: 'Purchase_Register_Q4.xlsx',
      fileData: SAMPLE_BASE64_FILE,
      uploadedById: userRohit.id,
    },
  });
  await prisma.auditEvent.createMany({
    data: [
      {
        firmId: firmA.id,
        documentId: docPurchase.id,
        actorId: userRohit.id,
        action: AuditAction.DOCUMENT_REQUIREMENT_ADDED,
        createdAt: new Date(now - 1000 * 60 * 60 * 30),
      },
      {
        firmId: firmA.id,
        documentId: docPurchase.id,
        actorId: userRohit.id,
        action: AuditAction.DOCUMENT_UPLOADED,
        createdAt: new Date(now - 1000 * 60 * 60 * 18),
      },
    ],
  });

  // 4. GST Return (CORRECTION_REQUIRED)
  const docGST = await prisma.document.create({
    data: {
      name: 'GST Return GSTR-3B March',
      status: DocumentStatus.CORRECTION_REQUIRED,
      clientId: clientA.id,
      firmId: firmA.id,
      reviewComment: 'GSTR-2B mismatch on invoice INV-2291, please reconcile and re-upload.',
    },
  });
  await prisma.documentVersion.create({
    data: {
      documentId: docGST.id,
      versionNumber: 1,
      fileName: 'GSTR3B_March_Draft.pdf',
      fileData: SAMPLE_BASE64_FILE,
      uploadedById: userRohit.id,
    },
  });
  await prisma.auditEvent.createMany({
    data: [
      {
        firmId: firmA.id,
        documentId: docGST.id,
        actorId: userRohit.id,
        action: AuditAction.DOCUMENT_REQUIREMENT_ADDED,
        createdAt: new Date(now - 1000 * 60 * 60 * 72),
      },
      {
        firmId: firmA.id,
        documentId: docGST.id,
        actorId: userRohit.id,
        action: AuditAction.DOCUMENT_UPLOADED,
        createdAt: new Date(now - 1000 * 60 * 60 * 48),
      },
      {
        firmId: firmA.id,
        documentId: docGST.id,
        actorId: userAman.id,
        action: AuditAction.REVIEW_STARTED,
        createdAt: new Date(now - 1000 * 60 * 60 * 24),
      },
      {
        firmId: firmA.id,
        documentId: docGST.id,
        actorId: userAman.id,
        action: AuditAction.CORRECTION_REQUESTED,
        comment: 'GSTR-2B mismatch on invoice INV-2291, please reconcile and re-upload.',
        createdAt: new Date(now - 1000 * 60 * 60 * 10),
      },
    ],
  });

  // 5. Expense Summary (PENDING)
  const docExpense = await prisma.document.create({
    data: {
      name: 'Travel & Conveyance Expense Summary',
      status: DocumentStatus.PENDING,
      clientId: clientA.id,
      firmId: firmA.id,
    },
  });
  await prisma.auditEvent.create({
    data: {
      firmId: firmA.id,
      documentId: docExpense.id,
      actorId: userRohit.id,
      action: AuditAction.DOCUMENT_REQUIREMENT_ADDED,
      comment: 'Added requirement for audit sample review',
      createdAt: new Date(now - 1000 * 60 * 60 * 5),
    },
  });

  // -------------------------------------------------------------
  // FIRM B: XYZ & Co.
  // -------------------------------------------------------------
  const firmB = await prisma.firm.create({
    data: {
      name: 'XYZ & Co.',
    },
  });

  const userPriya = await prisma.user.create({
    data: {
      name: 'Priya Verma',
      email: 'priya@xyz.co',
      passwordHash: commonPasswordHash,
      role: Role.STAFF,
      firmId: firmB.id,
    },
  });

  const userKaran = await prisma.user.create({
    data: {
      name: 'Karan Mehta',
      email: 'karan@xyz.co',
      passwordHash: commonPasswordHash,
      role: Role.REVIEWER,
      firmId: firmB.id,
    },
  });

  const clientB = await prisma.client.create({
    data: {
      name: 'XYZ Industries Ltd.',
      firmId: firmB.id,
    },
  });

  // Firm B Documents
  const docXYZ1 = await prisma.document.create({
    data: {
      name: 'Form 26AS Annual Tax Statement',
      status: DocumentStatus.APPROVED,
      clientId: clientB.id,
      firmId: firmB.id,
    },
  });
  await prisma.documentVersion.create({
    data: {
      documentId: docXYZ1.id,
      versionNumber: 1,
      fileName: 'Form_26AS_AY24-25.pdf',
      fileData: SAMPLE_BASE64_FILE,
      uploadedById: userPriya.id,
    },
  });
  await prisma.auditEvent.createMany({
    data: [
      {
        firmId: firmB.id,
        documentId: docXYZ1.id,
        actorId: userPriya.id,
        action: AuditAction.DOCUMENT_REQUIREMENT_ADDED,
        createdAt: new Date(now - 1000 * 60 * 60 * 50),
      },
      {
        firmId: firmB.id,
        documentId: docXYZ1.id,
        actorId: userPriya.id,
        action: AuditAction.DOCUMENT_UPLOADED,
        createdAt: new Date(now - 1000 * 60 * 60 * 40),
      },
      {
        firmId: firmB.id,
        documentId: docXYZ1.id,
        actorId: userKaran.id,
        action: AuditAction.REVIEW_STARTED,
        createdAt: new Date(now - 1000 * 60 * 60 * 20),
      },
      {
        firmId: firmB.id,
        documentId: docXYZ1.id,
        actorId: userKaran.id,
        action: AuditAction.DOCUMENT_APPROVED,
        comment: 'TDS credits matched with IT portal entries.',
        createdAt: new Date(now - 1000 * 60 * 60 * 15),
      },
    ],
  });

  const docXYZ2 = await prisma.document.create({
    data: {
      name: 'Fixed Asset Register',
      status: DocumentStatus.UNDER_REVIEW,
      clientId: clientB.id,
      firmId: firmB.id,
    },
  });
  await prisma.documentVersion.create({
    data: {
      documentId: docXYZ2.id,
      versionNumber: 1,
      fileName: 'Fixed_Assets_Schedule.xlsx',
      fileData: SAMPLE_BASE64_FILE,
      uploadedById: userPriya.id,
    },
  });
  await prisma.auditEvent.createMany({
    data: [
      {
        firmId: firmB.id,
        documentId: docXYZ2.id,
        actorId: userPriya.id,
        action: AuditAction.DOCUMENT_REQUIREMENT_ADDED,
        createdAt: new Date(now - 1000 * 60 * 60 * 30),
      },
      {
        firmId: firmB.id,
        documentId: docXYZ2.id,
        actorId: userPriya.id,
        action: AuditAction.DOCUMENT_UPLOADED,
        createdAt: new Date(now - 1000 * 60 * 60 * 20),
      },
      {
        firmId: firmB.id,
        documentId: docXYZ2.id,
        actorId: userKaran.id,
        action: AuditAction.REVIEW_STARTED,
        createdAt: new Date(now - 1000 * 60 * 60 * 8),
      },
    ],
  });

  const docXYZ3 = await prisma.document.create({
    data: {
      name: 'Director Disclosure Statements',
      status: DocumentStatus.PENDING,
      clientId: clientB.id,
      firmId: firmB.id,
    },
  });
  await prisma.auditEvent.create({
    data: {
      firmId: firmB.id,
      documentId: docXYZ3.id,
      actorId: userPriya.id,
      action: AuditAction.DOCUMENT_REQUIREMENT_ADDED,
      createdAt: new Date(now - 1000 * 60 * 60 * 12),
    },
  });

  console.log('Seeding completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
