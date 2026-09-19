import { assertValidTransition, TransitionError } from '../lib/transitions';
import { DocumentStatus, AuditAction } from '@prisma/client';
import { prisma, scopedPrisma } from '../lib/db';
import bcrypt from 'bcryptjs';

async function runSystemTests() {
  console.log('===================================================');
  console.log('  RUNNING AUTOMATED AUDIT SYSTEM VERIFICATION TESTS');
  console.log('===================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------
  // TEST SUITE 1: STATUS STATE MACHINE TRANSITION RULES
  // -------------------------------------------------------------------
  console.log('[SUITE 1] State Machine Transition Rules (lib/transitions.ts)');

  // 1.1 Valid Upload from PENDING -> UPLOADED
  const res1 = assertValidTransition(DocumentStatus.PENDING, AuditAction.DOCUMENT_UPLOADED);
  assert(res1 === DocumentStatus.UPLOADED, 'PENDING + DOCUMENT_UPLOADED -> UPLOADED');

  // 1.2 Valid Review Start from UPLOADED -> UNDER_REVIEW
  const res2 = assertValidTransition(DocumentStatus.UPLOADED, AuditAction.REVIEW_STARTED);
  assert(res2 === DocumentStatus.UNDER_REVIEW, 'UPLOADED + REVIEW_STARTED -> UNDER_REVIEW');

  // 1.3 Valid Approval from UNDER_REVIEW -> APPROVED
  const res3 = assertValidTransition(DocumentStatus.UNDER_REVIEW, AuditAction.DOCUMENT_APPROVED);
  assert(res3 === DocumentStatus.APPROVED, 'UNDER_REVIEW + DOCUMENT_APPROVED -> APPROVED');

  // 1.4 Valid Correction Request from UNDER_REVIEW -> CORRECTION_REQUIRED
  const res4 = assertValidTransition(DocumentStatus.UNDER_REVIEW, AuditAction.CORRECTION_REQUESTED);
  assert(res4 === DocumentStatus.CORRECTION_REQUIRED, 'UNDER_REVIEW + CORRECTION_REQUESTED -> CORRECTION_REQUIRED');

  // 1.5 Valid Re-upload from CORRECTION_REQUIRED -> UPLOADED (Loop back)
  const res5 = assertValidTransition(DocumentStatus.CORRECTION_REQUIRED, AuditAction.DOCUMENT_UPLOADED);
  assert(res5 === DocumentStatus.UPLOADED, 'CORRECTION_REQUIRED + DOCUMENT_UPLOADED -> UPLOADED');

  // 1.6 Invalid Direct Transition PENDING -> APPROVED
  try {
    assertValidTransition(DocumentStatus.PENDING, AuditAction.DOCUMENT_APPROVED);
    assert(false, 'PENDING + DOCUMENT_APPROVED should throw TransitionError');
  } catch (err) {
    assert(err instanceof TransitionError, 'PENDING + DOCUMENT_APPROVED throws TransitionError (400)');
  }

  // 1.7 Terminal Approved State Locked
  try {
    assertValidTransition(DocumentStatus.APPROVED, AuditAction.CORRECTION_REQUESTED);
    assert(false, 'APPROVED + CORRECTION_REQUESTED should throw TransitionError');
  } catch (err) {
    assert(err instanceof TransitionError, 'APPROVED status is terminal and throws TransitionError on mutation');
  }

  // -------------------------------------------------------------------
  // TEST SUITE 2: DEFENSE-IN-DEPTH TENANT ISOLATION
  // -------------------------------------------------------------------
  console.log('\n[SUITE 2] Multi-Tenant Isolation Engine (lib/db.ts & scopedPrisma)');

  const firmA = await prisma.firm.findFirst({ where: { name: 'ABC & Co.' } });
  const firmB = await prisma.firm.findFirst({ where: { name: 'XYZ & Co.' } });

  if (!firmA || !firmB) {
    console.error('Database must be seeded before running tests. Run `npx prisma db seed`.');
    process.exit(1);
  }

  const dbFirmA = scopedPrisma(firmA.id);
  const dbFirmB = scopedPrisma(firmB.id);

  // 2.1 Firm A user listing clients gets only Firm A clients
  const firmAClients = await dbFirmA.client.findMany();
  const allClientsBelongToFirmA = firmAClients.every((c) => c.firmId === firmA.id);
  assert(
    firmAClients.length > 0 && allClientsBelongToFirmA,
    'scopedPrisma(Firm A) returns ONLY Firm A clients'
  );

  // 2.2 Firm A user listing documents gets zero Firm B documents
  const firmADocuments = await dbFirmA.document.findMany();
  const containsFirmBDocs = firmADocuments.some((d) => d.firmId === firmB.id);
  assert(!containsFirmBDocs, 'scopedPrisma(Firm A) hides all Firm B documents');

  // 2.3 Attempting cross-tenant access returns null (triggers 404 in API route)
  const firmBDocument = await prisma.document.findFirst({ where: { firmId: firmB.id } });
  if (firmBDocument) {
    const crossAccessResult = await dbFirmA.document.findFirst({
      where: { id: firmBDocument.id },
    });
    assert(crossAccessResult === null, 'Firm A query for Firm B document ID returns null (triggers 404)');
  }

  // -------------------------------------------------------------------
  // TEST SUITE 3: AUTHENTICATION & PASSWORD SECURITY
  // -------------------------------------------------------------------
  console.log('\n[SUITE 3] Auth Security & Credential Hashing');

  const rohitUser = await prisma.user.findFirst({ where: { email: 'rohit@abc.co' } });
  assert(rohitUser !== null, 'Seeded user rohit@abc.co exists');

  if (rohitUser) {
    const validPass = await bcrypt.compare('password123', rohitUser.passwordHash);
    const invalidPass = await bcrypt.compare('wrongpassword', rohitUser.passwordHash);
    assert(validPass, 'bcrypt verifies correct password password123');
    assert(!invalidPass, 'bcrypt rejects invalid password');
  }

  // -------------------------------------------------------------------
  // TEST SUITE 4: AUDIT TRAIL IMMUTABILITY & EVENTS
  // -------------------------------------------------------------------
  console.log('\n[SUITE 4] Transactional Audit Log Integrity');

  const auditEventsFirmA = await dbFirmA.auditEvent.findMany();
  assert(auditEventsFirmA.length > 0, 'Audit history recorded for Firm A actions');

  const hasCorrectionReason = auditEventsFirmA.some(
    (e) => e.action === AuditAction.CORRECTION_REQUESTED && e.comment !== null
  );
  assert(hasCorrectionReason, 'CORRECTION_REQUESTED audit event captures mandatory reviewer comment');

  // -------------------------------------------------------------------
  // TEST SUMMARY
  // -------------------------------------------------------------------
  console.log('\n===================================================');
  console.log(`  TEST RESULTS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSystemTests()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error('Test execution error:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
