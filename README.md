# Obliq Mini Audit Document Review System — FE-2 Evaluation Submission

## 1. Overview
This repository contains a working, self-contained prototype of an **Audit Document Review System** built for Indian Chartered Accountant (CA) firms as part of the Obliq FE-2 evaluation. Designed with extreme scope discipline (*"A small working product is better than a large unfinished product"*), the system focuses on a rock-solid core document review workflow, strict multi-tenant isolation between audit firms, atomic status state machine transitions, and complete immutable audit trails.

---

## 2. Setup Instructions

### Prerequisites
- Node.js (v18+ or v20+) & npm
- PostgreSQL database (or a free cloud instance from Neon / Supabase)

### Quick Start

1. **Clone the repository and install dependencies**:
   ```bash
   git clone <repository-url>
   cd obliq3
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Set your `DATABASE_URL` (PostgreSQL connection string) and `JWT_SECRET`:
   ```env
   DATABASE_URL="postgresql://user:password@ep-sample-123456.us-east-2.aws.neon.tech/obliq_db?sslmode=require"
   JWT_SECRET="obliq_super_secret_jwt_key_2026_audit_review"
   ```

3. **Run Database Migrations & Seed**:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

4. **Run Automated System Tests**:
   ```bash
   npm test
   ```
   *Executes 15 automated test assertions covering state machine transitions, multi-tenant boundary security, bcrypt authentication, and transactional audit trails.*

5. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

### Demo Login Credentials

All seeded accounts use password `password123`. The login page (`/login`) includes 1-click autofill buttons for convenience:

| Firm | Name | Role | Email | Password |
| :--- | :--- | :--- | :--- | :--- |
| **Firm A (ABC & Co.)** | Rohit Sharma | STAFF | `rohit@abc.co` | `password123` |
| **Firm A (ABC & Co.)** | Aman Gupta | REVIEWER | `aman@abc.co` | `password123` |
| **Firm B (XYZ & Co.)** | Priya Verma | STAFF | `priya@xyz.co` | `password123` |
| **Firm B (XYZ & Co.)** | Karan Mehta | REVIEWER | `karan@xyz.co` | `password123` |

---

## 3. Architecture Diagram

```
+-------------------------------------------------------------------------+
|                              REACT FRONTEND                             |
|    Next.js 14 App Router (Tailwind CSS, Client-side Size Validation)    |
+------------------------------------+------------------------------------+
                                     |  HTTP-Only Cookie (Signed JWT)
                                     v
+-------------------------------------------------------------------------+
|                           API ROUTE HANDLERS                            |
|  - Auth Middleware & Session Extraction: getSessionOrThrow(req)         |
|  - Role-Based Access Control (RBAC): requireRole(session, allowedRoles) |
|  - Server-Side Validation: Zod Schemas                                  |
|  - Status State Machine Engine: assertValidTransition(status, action)   |
|  - Tenant Isolation Layer: scopedPrisma(session.firmId)                 |
+------------------------------------+------------------------------------+
                                     |  Atomic $transaction
                                     v
+-------------------------------------------------------------------------+
|                           PRISMA ORM & DATABASE                         |
|  PostgreSQL Database (Firm, User, Client, Document, DocumentVersion,    |
|  AuditEvent with @@index([firmId]) on every tenant model)               |
+-------------------------------------------------------------------------+
```

---

## 4. Tenant Isolation Explanation

Tenant isolation is critical when building compliance software for CA firms handling sensitive financial data. In this system, tenant boundary security is enforced using a multi-layered defense-in-depth architecture:

1. **JWT-Derived Firm Identity as Single Source of Truth**:
   Authentication issues a signed JWT token stored inside an `httpOnly`, `sameSite=lax`, `secure` cookie containing `{ userId, firmId, role }`. The `firmId` is extracted server-side inside `getSessionOrThrow(req)`. Client inputs (query parameters or request bodies) are **never** trusted for scoping.

2. **Centralized Query Scoping (`scopedPrisma`)**:
   To prevent developers from forgetting `firmId` filters in individual endpoints, data access for `Client`, `Document`, `DocumentVersion`, and `AuditEvent` models is centralized through `scopedPrisma(session.firmId)` in `lib/db.ts`. Every database read and count automatically injects `{ firmId: session.firmId }` into the query predicate.

3. **Defense-in-Depth Resource Check**:
   On single-resource fetches (e.g. `GET /api/documents/[id]`), after querying the database, the API handler explicitly re-validates `if (document.firmId !== session.firmId) return 404`. Returning `404 Not Found` instead of `403 Forbidden` prevents malicious actors from discovering the existence of resource IDs belonging to competing firms.

4. **Authentication vs. Authorization Separation**:
   Authentication proves *who you are*; Authorization dictates *what you can touch*. Hiding action buttons on the frontend is merely a UX convenience — security is strictly enforced inside Next.js API route handlers using `requireRole(session, allowedRoles)` and `assertValidTransition()`.

---

## 5. Status State Machine Diagram

```
               +-------------------+
               |      PENDING      |
               +---------+---------+
                         |
                         | (Staff Uploads File)
                         v
               +-------------------+
               |     UPLOADED      |
               +---------+---------+
                         |
                         | (Reviewer Starts Review)
                         v
               +-------------------+
               |   UNDER_REVIEW    |
               +----+---------+----+
                    |         |
 (Reviewer Approves)|         | (Reviewer Requests Correction
                    |         |  with Mandatory Reason)
                    v         v
         +----------+---+   +-+-------------------+
         |   APPROVED   |   | CORRECTION_REQUIRED |
         | (Terminal)   |   +----------+----------+
         +--------------+              |
                                       | (Staff Re-Uploads File)
                                       +-------> [Loops back to UPLOADED]
```

---

## 6. AI Tools Used

AI Tools Used:
ChatGPT: N/A
Claude: N/A
Gemini: Gemini 1.5 Pro / 2.0 Flash (via Google Antigravity Agentic IDE)
Cursor: N/A
GitHub Copilot: N/A
How AI was used: Used Google Antigravity (Gemini-powered AI assistant) for architectural planning, designing the Prisma multi-tenant schema, constructing the status transition state machine, implementing defense-in-depth tenant isolation checks, and building the Google Sans UI system with Framer Motion animated micro-interactions.

---

## 7. What Would You Improve with One More Week?

If given one additional week to enhance the system, the top high-value improvements would be:

1. **Cloud Blob Storage**: Transition document file payloads from Postgres Base64 strings to AWS S3 / Vercel Blob with secure pre-signed URLs for scalable file handling.
2. **Automated Document Pre-validation**: Integrate OCR/LLM sanity checks on file upload to verify document types and flag basic discrepancies (e.g., page count checks or GSTR-3B vs GSTR-2B mismatches) before human review.
3. **Automated Staff & Client Notifications**: Trigger automated WhatsApp/email notifications to staff members when a reviewer flags a document as `Correction Required`.
4. **Bulk Zipped Export**: Allow reviewers to export all approved audit documents for a client in a single organized ZIP package ready for IT portal filing.
5. **Comprehensive Automated Test Suite**: Add end-to-end integration tests using Playwright to continuously verify multi-tenant isolation boundaries and state transition locks.

---

## 8. Screenshots

*Placeholder: Add screenshots of the following views after running the application locally:*

1. `/login` — Login page with Demo Accounts autofill panel.
2. `/dashboard` — Firm client overview cards.
3. `/clients/[id]` — Client document checklist with status badges.
4. `/documents/[id]` — Document detail page, correction callout, review actions, and full Audit Trail timeline.
5. `/audit` — Firm-wide audit feed.
