# ClearAudit

A small document review app for audit teams. Staff upload documents, reviewers check them, and every important action is recorded.

The project is built with Next.js, Prisma, and PostgreSQL. It includes two demo firms so the tenant boundary can be tested from the UI and from the system tests.

<details>
<summary>What is included</summary>

- Staff can add document requirements and upload new versions.
- Reviewers can start a review, request a correction with a reason, or approve a document.
- Approved documents cannot be changed.
- Each firm sees only its own clients, documents, versions, and audit events.
- The audit timeline shows who did what and when.

</details>

<details>
<summary>Run it locally</summary>

### Requirements

- Node.js 18 or newer
- A PostgreSQL database

### Install

```bash
git clone <repository-url>
cd obliq3
npm install
```

Create `.env.local` in the project root:

```env
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
JWT_SECRET="replace-this-with-a-long-random-value"
```

Create the tables and demo data:

```bash
npx prisma db push
npx prisma db seed
```

Start the app:

```bash
npm run dev
```

Open <http://localhost:3000>.

> `prisma db seed` clears the existing records before inserting the demo data. Use it only with a development or demo database.

</details>

<details>
<summary>Demo accounts</summary>

All accounts use the password `password123`.

| Firm | User | Role | Email |
| --- | --- | --- | --- |
| ABC & Co. | Rohit Sharma | Staff | `rohit@abc.co` |
| ABC & Co. | Aman Gupta | Reviewer | `aman@abc.co` |
| XYZ & Co. | Priya Verma | Staff | `priya@xyz.co` |
| XYZ & Co. | Karan Mehta | Reviewer | `karan@xyz.co` |

To check tenant isolation, sign in as a user from either firm and confirm that the other firm's records are not visible.

</details>

<details>
<summary>How the app is put together</summary>

```mermaid
flowchart TD
    Browser[Browser] --> Routes[Next.js pages and API routes]
    Routes --> Auth[Session and role checks]
    Auth --> Scope[Queries scoped to the user's firm]
    Scope --> Rules[Document transition rules]
    Rules --> Database[(PostgreSQL via Prisma)]
    Rules --> Audit[Audit events]
    Audit --> Database
```

The browser sends requests with an httpOnly session cookie. The server gets the firm ID from that session, checks the user's role, and applies the firm ID to database queries. The browser is not trusted to provide the firm ID.

</details>

<details>
<summary>Document review flow</summary>

```mermaid
stateDiagram-v2
    [*] --> PENDING
    PENDING --> UPLOADED: Staff uploads a file
    UPLOADED --> UNDER_REVIEW: Reviewer starts review
    UNDER_REVIEW --> APPROVED: Reviewer approves
    UNDER_REVIEW --> CORRECTION_REQUIRED: Reviewer gives a reason
    CORRECTION_REQUIRED --> UPLOADED: Staff uploads a new version
    APPROVED --> [*]
```

Every status change and upload is written with the action, user, firm, document, and time. A correction request must include a note. `APPROVED` is the final state.

</details>

<details>
<summary>Tenant isolation</summary>

```mermaid
sequenceDiagram
    actor A as Firm A user
    actor B as Firm B user
    participant API as API route
    participant DB as PostgreSQL

    A->>API: Request document
    API->>DB: Find document by ID and Firm A ID
    DB-->>A: Document details

    B->>API: Request the same document
    API->>DB: Find document by ID and Firm B ID
    DB-->>B: Not found
```

The firm ID comes from the signed session. Shared query helpers add that ID to reads and writes for clients, documents, versions, and audit events. A document from another firm is returned as not found rather than exposed.

</details>

<details>
<summary>Useful commands</summary>

```bash
npm run dev       # Start the development server
npm run build     # Create a production build
npm start         # Run the production build
npm test          # Run the system checks
npm run lint      # Run ESLint
```

</details>

<details>
<summary>Deploy for free for an evaluation</summary>

The simplest free setup is **Vercel Hobby for the Next.js app** and a **free Neon PostgreSQL database**. Both have usage limits, but they are suitable for a small evaluation demo. Vercel Hobby is intended for personal or non-commercial use.

### 1. Create the database

1. Create a project at [Neon](https://neon.tech/).
2. Copy its pooled PostgreSQL connection string.
3. In the project folder, create `.env.local`:

```env
DATABASE_URL="your-neon-connection-string"
JWT_SECRET="use-a-long-random-production-value"
```

4. Create the schema and demo records in Neon:

```bash
npx prisma db push
npx prisma db seed
```

### 2. Deploy the app

1. Push the repository to GitHub.
2. Import it at [Vercel](https://vercel.com/new).
3. Keep the detected framework as Next.js.
4. Add `DATABASE_URL` and `JWT_SECRET` under the Vercel project environment variables. Add them for **Production**, and for **Preview** too if evaluators will use preview deployments.
5. Deploy.

Vercel will run the existing Next.js build. The database must already contain the schema and seed records because the repository does not run `prisma db push` or `prisma db seed` automatically during a deployment.

### 3. Test the public URL

- Open `/login`.
- Sign in with one of the demo accounts above.
- Try the staff upload flow and reviewer flow.
- Run `npm test` locally against the same Neon database if you want to verify tenant isolation and status transitions before sharing the URL.

For a disposable evaluator demo, this is enough. Do not use the seeded passwords or a shared free database for real audit documents.

</details>

<details>
<summary>Project layout</summary>

```text
app/                  Pages and API routes
components/           Reusable UI components
lib/                  Authentication, database access, and audit helpers
prisma/schema.prisma  Database models and status values
prisma/seed.ts        Demo firms, users, clients, and documents
scripts/test-system.ts System checks
```

</details>
