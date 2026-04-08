# OrderHive

OrderHive is an internal order and sales operations platform for Indglobal Realty. It centralizes real-estate deal tracking, supporting documents, compliance review, finance review, user access control, and DocuSign-based document signing in one SvelteKit application.

The repository is not a generic starter anymore. It is a role-based business app with Firebase-backed data, server-side file handling, PDF generation, and operational workflows for agents, admins, compliance, and finance teams.

## What This Repo Does

OrderHive is built around the lifecycle of a property sale.

- Agents create and manage sales records.
- Each sale can include buyer details, joint buyers, deal owners, property details, payment documents, and referral/AML paperwork.
- Compliance and finance teams review different parts of the same sale pipeline.
- Admin users manage access, teams, bulk imports, and organization-wide visibility.
- DocuSign is used to generate and send AML forms and referral agreements for signature.
- Firebase stores application data, roles, and uploaded files.

## Main Product Areas

The application is grouped by role under the secure route tree.

### Public Area

- `/` login screen with Google sign-in.
- Server-side authorization is finalized after Google auth by looking up the user in Firestore.

### Secure Areas

- `/admin/dashboard` administrative landing page.
- `/admin/access-management` role assignment and access control tooling.
- `/admin/all-sales` organization-wide sales view.
- `/admin/team-management` team-related admin workflow.
- `/admin/bulk-import` CSV-based sale import flow.
- `/agent/dashboard` agent landing page.
- `/agent/sales-tracker` agent-facing sales tracker with create/view/update workflows.
- `/agent/notifications` agent notification area.
- `/compliance/dashboard` compliance landing page.
- `/compliance/pending-sales` pending compliance review queue.
- `/compliance/approved-sales` approved compliance queue.
- `/compliance/invoices` compliance invoice-related workflow.
- `/compliance/next-months-sales` forward-looking compliance pipeline.
- `/finance/dashboard` finance landing page.
- `/finance/pending-sales` pending finance review queue.
- `/finance/approved-sales` approved finance queue.
- `/finance/invoices` finance invoice-related workflow.
- `/finance/next-months-sales` finance forecasting/pipeline view.
- `/profile` shared profile page.

Access to those route groups is enforced in server hooks based on the signed-in user's role.

## Core Workflows

### 1. Login and Access Control

- Users authenticate with Google on the public landing page.
- The server checks the `roles` collection in Firestore to determine the user's `accessType`.
- A session cookie is set after successful authorization.
- Allowed route prefixes are enforced in `src/hooks.server.ts` and `src/lib/constants.ts`.
- In local development, secure routes are intentionally bypassed with a dev `super-admin` user so UI work can proceed without full auth setup.

### 2. Sales Tracking

Agents and admins work with sale records that include:

- primary buyer information
- joint buyer information
- deal owners and split percentages
- payment stage and payment documents
- project and property details
- referral amount and invoice stage metadata
- AML form and referral agreement artifacts

Sale creation is implemented with a remote form action in `src/routes/(secure)/agent/sales-tracker/sales.remote.ts`.

Important sale behavior already present in code:

- predictable sale IDs are generated in the `IND-YYYYMMDD-XXXX` format
- ownership splits must total `100%`
- property-specific validation changes based on property type
- supporting files are uploaded to Firebase Storage
- Firestore stores both business data and file metadata

### 3. AML Form Generation

AML form submission is handled by `src/routes/(secure)/agent/sales-tracker/aml.remote.ts`.

The flow is:

1. collect AML data
2. render an HTML template with real values
3. generate a PDF using Puppeteer
4. send the PDF to DocuSign
5. store envelope metadata and allow later retrieval

This exists because PDF generation preserves styling better than relying on DocuSign's basic HTML rendering.

### 4. Referral Agreement Generation

Referral agreement submission is handled by `src/routes/(secure)/agent/sales-tracker/referral.remote.ts`.

The flow is similar to AML generation:

1. collect referrer and agreement details
2. render the referral template
3. convert to PDF
4. create a DocuSign envelope
5. send the agreement to the recipient for signature

### 5. Bulk Import

Admins can import sales from CSV using `src/routes/(secure)/admin/bulk-import/bulk-import.remote.ts`.

The import flow supports:

- primary buyer rows
- joint buyer rows
- validation modes
- sales record creation in Firestore
- creation or lookup of referenced users/roles by email

The repository includes `static/sample-bulk-upload.csv` as the sample import format.

## Architecture Overview

### Frontend

- Svelte 5
- SvelteKit 2
- Tailwind CSS 4
- Bits UI / shadcn-style UI primitives under `src/lib/components/ui`
- TanStack table core for table-oriented screens
- `svelte-firekit` for Firebase auth and collection bindings
- icon usage via Lucide, Tabler, and `unplugin-icons`

### Backend / Server Responsibilities

This repo uses SvelteKit server features rather than a separate backend service.

Key server modules:

- `src/lib/server/firebase.ts`: Firebase Admin app, Firestore, Storage, session helpers, upload helper
- `src/lib/server/docusign.ts`: DocuSign JWT authentication, envelope creation, document retrieval
- `src/lib/server/template-renderer.ts`: template population for generated documents
- `src/lib/server/pdf-generator.ts`: Puppeteer-based HTML to PDF rendering

### Remote Functions

The app enables SvelteKit experimental remote functions in `svelte.config.js`.

That pattern is used for server-side business actions such as:

- auth redirect/session creation
- sale creation
- AML generation
- referral generation
- access management changes
- bulk import

### Data Storage

The code currently indicates these Firebase collections are central:

- `roles`: authorization and access control by email
- `users`: user records used during bulk import and ownership lookups
- `sales`: primary business records
- `counters`: daily sale number generation

Firebase Storage is used for uploaded documents such as:

- passports
- national IDs
- booking forms
- payment receipts
- generated or uploaded AML documents
- referral agreements
- invoice files

## Tech Stack

- Svelte 5
- SvelteKit 2
- TypeScript
- Tailwind CSS 4
- Firebase Admin SDK
- Firestore
- Firebase Storage
- DocuSign eSign API
- Puppeteer
- Zod
- Prettier + ESLint
- Docker
- Netlify configuration

## Repository Layout

High-level structure:

```text
.
├── AGENTS.md
├── DOCUSIGN_SETUP.md
├── Dockerfile
├── netlify.toml
├── svelte.config.js
├── src/
│   ├── hooks.server.ts
│   ├── app.d.ts
│   ├── lib/
│   │   ├── constants.ts
│   │   ├── components/
│   │   ├── server/
│   │   │   ├── firebase.ts
│   │   │   ├── docusign.ts
│   │   │   ├── pdf-generator.ts
│   │   │   └── template-renderer.ts
│   │   └── svg/
│   └── routes/
│       ├── +page.svelte
│       ├── auth.remote.ts
│       ├── api/get-docusign-document/+server.ts
│       └── (secure)/
│           ├── +layout.server.ts
│           ├── admin/
│           ├── agent/
│           ├── compliance/
│           ├── finance/
│           └── profile/
├── static/
│   └── sample-bulk-upload.csv
├── aml-form-docusign.html
└── referral-agreement-docusign.html
```

## Environment Variables

The current code reads only server-side private environment variables.

### Firebase

Set these for Firebase Admin:

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_BUCKET=
```

Notes:

- `FIREBASE_PRIVATE_KEY` must preserve line breaks. The server code converts escaped `\n` sequences back into real newlines.
- `FIREBASE_BUCKET` should be the Firebase Storage bucket name used for file uploads.

### DocuSign

Set these for DocuSign integration:

```env
DOCUSIGN_INTEGRATION_KEY=
DOCUSIGN_USER_ID=
DOCUSIGN_PRIVATE_KEY=
DOCUSIGN_BASE_PATH=
```

Notes:

- account ID is discovered dynamically after authentication and does not need to be configured separately
- `DOCUSIGN_PRIVATE_KEY` also expects escaped newlines to be converted on the server
- detailed DocuSign setup steps are documented in `DOCUSIGN_SETUP.md`

### Build / Runtime Flags

These are used by build and deployment flows:

```env
NODE_BUILD=true
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
DOTENV_PRIVATE_KEY_CI=
```

`NODE_BUILD=true` switches SvelteKit to `@sveltejs/adapter-node` so a Node-compatible `build/` output is produced.

## Local Development

### Prerequisites

- Node.js 20+
- pnpm 10+
- Firebase project credentials
- DocuSign credentials if you need document generation

The repository discourages `npm` and `yarn`. Use `pnpm` for normal local work.

### Install

```sh
pnpm install
```

### Start the App

```sh
pnpm dev
```

The configured dev server runs on port `3001` by default.

### Useful Commands

```sh
pnpm check
pnpm lint
pnpm lint:fix
pnpm build
pnpm preview
```

## Authentication Notes

- Public login uses Google via `svelte-firekit`.
- Server-side authorization is not based on Google alone; the user must also exist in Firestore role data.
- The session cookie stores a small JSON payload with `uid`, `email`, and `role`.
- In development mode, secure routes are auto-populated with a `super-admin` user. This is convenient for local UI work, but it also means local auth behavior differs from production.

## File Upload and Document Handling

Uploaded files are stored using Firebase Storage and a generated download token.

The server stores metadata including:

- storage path
- download URL
- content type
- file size
- original filename
- last modified timestamp
- workflow status fields for finance/compliance

Generated documents follow a server-side rendering flow instead of being built in the browser.

## DocuSign Integration

DocuSign is used for two main document workflows:

- AML / KYC forms
- referral agreements

The implementation uses JWT-based service authentication and caches tokens in memory inside the server runtime.

Related files:

- `src/lib/server/docusign.ts`
- `src/lib/server/template-renderer.ts`
- `src/lib/server/pdf-generator.ts`
- `aml-form-docusign.html`
- `referral-agreement-docusign.html`

There is also an API endpoint for retrieving generated documents:

- `GET /api/get-docusign-document?envelopeId=<id>&documentId=1`

For full operational setup, see `DOCUSIGN_SETUP.md`.

## Deployment

### Netlify

`netlify.toml` is present and configures:

- build command
- publish output
- immutable caching headers for app assets
- a catch-all redirect to the SvelteKit Netlify function
- secrets scanner exclusions for server-only build output

### Docker / Node Runtime

The `Dockerfile` supports a Node deployment with Chromium installed for Puppeteer-based PDF generation.

Important characteristics:

- multi-stage build
- `pnpm` managed dependencies
- system Chromium instead of Puppeteer's bundled browser
- non-root runtime user
- dotenvx-based runtime wrapper

## Operational Notes

- The app is tightly coupled to Firestore data shape and role records.
- Most business operations assume internal Indglobal users and workflows rather than public self-service usage.
- There is no dedicated automated test suite in the repository at the moment.
- Validation is primarily handled by Zod schemas, SvelteKit server logic, and TypeScript.

## Related Files

- `DOCUSIGN_SETUP.md`: DocuSign setup and troubleshooting
- `static/sample-bulk-upload.csv`: sample CSV import file
- `components.json`: component generator/UI configuration
- `svelte.config.js`: adapter and remote function configuration
- `src/app.d.ts`: core business types, especially `Sale` and `Role`

## Recommended First Read for New Contributors

If you are onboarding to this repo, read these in order:

1. `src/lib/constants.ts`
2. `src/hooks.server.ts`
3. `src/app.d.ts`
4. `src/routes/(secure)/agent/sales-tracker/sales.remote.ts`
5. `src/lib/server/firebase.ts`
6. `src/lib/server/docusign.ts`
7. `DOCUSIGN_SETUP.md`

That path gives you the fastest understanding of the auth model, route authorization, main business entity, persistence layer, and document workflow.
