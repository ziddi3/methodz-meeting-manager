# Methodz Meeting Manager

Offline-first meeting preparation, capture, analysis, archive, and records for Canadian Soft Water Corporation, Method HVAC Inc., and future partner workflows connected through the Methodz brand ecosystem.

> Methodz is a shared brand identity and operating ecosystem, not a separate company.

## Current release

**App shell 1.6.6 · Meeting-record schema 1.6.0 · Hosted-provider contract 1.0.0 · Synchronization rehearsal 1.0.0**

The application is plain HTML, CSS, and JavaScript. It has no required runtime packages, framework, build command, production backend, or mandatory server.

Open `meeting.html` directly or deploy the repository to an ordinary static host.

## What the application does

- Creates structured meeting records.
- Captures organizations and representatives present.
- Records attendance and explicit typed-signature consent.
- Organizes agenda items and discussion notes.
- Captures decisions and follow-up tasks.
- Assigns responsibility with **Assigned To**, never “Owner.”
- Generates meeting summaries and printable archive views.
- Stores active records, archived records, revisions, templates, directories, and governance metadata locally.
- Exports TXT, JSON, HTML, CSV, print/PDF, workspace backups, and controlled external packages.
- Supports retention, preservation holds, disposition review, redaction, recipient policy, release approval, receipts, optional package signing, and independent verification.
- Provides recovery inspection, no-write drills, hosted-provider conformance, and explicit synchronization rehearsals.
- Provides mobile and cross-device readiness checks without exporting meeting content.

## Entry points

```text
meeting.html   Main meeting workspace
archive.html   Dedicated detail and print view
verify.html    Standalone signed-package verifier
```

## v1.6.6 mobile and cross-device readiness

The Device Readiness panel checks:

- browser storage write access;
- storage quota and usage estimates;
- persistent-storage status;
- direct-file or service-worker state;
- Web Crypto availability;
- online/offline state;
- mobile viewport fit;
- counts of active, archived, revision, draft, template, directory, and synchronization-rehearsal data.

The downloadable report contains metadata and counts only. It excludes meeting titles, notes, tasks, decisions, attendees, organizations, record IDs, signatures, credentials, and key material.

Phone layouts add a touch-friendly Save, New, Records, and Device action dock, 44-pixel minimum controls, safe-area support, 16-pixel form inputs, and narrow-screen overflow protection.

See:

- `docs/V1.6.6-MOBILE-READINESS.md`
- `docs/V1.6.6-TESTS.md`

## Core principles

- Offline first.
- Static and directly deployable.
- No required server or runtime framework.
- Local records remain usable before any hosted provider is approved.
- Explicit confirmation before destructive actions.
- Non-destructive archive and revision history.
- Preservation holds block permanent disposition.
- External downloads require matching approval metadata.
- Recipient allow-lists apply after redaction.
- Typed signatures require consent and remain excluded from external copies.
- Private signing keys never enter browser storage, provider exports, workspace backups, or signed packages.
- Recovery reports exclude meeting and workspace values.
- Hosted-provider compatibility never substitutes for authentication, authorization, tenant isolation, or legal approval.
- Device readiness never substitutes for a protected backup or recovery rehearsal.
- Infrastructure must support the meeting workflow rather than replace it.

## Architecture

```text
Configuration
  config.js
  config-v11.js through config-v166.js

Schema and migrations
  migrations.js
  migrations-v10.js through migrations-v16.js

Record provider boundaries
  data-adapter.js
  async-data-adapter.js
  provider-contract.js
  hosted-provider-adapters.js
  provider-conformance.js
  http-provider-pilot.js

Synchronization rehearsal
  sync-rehearsal-core.js
  sync-rehearsal-hardening.js
  features-v165-sync-rehearsal.js

Package and recovery boundaries
  crypto-package-core.js
  key-custody-core.js
  workspace-package-core.js

Core workspace
  app.js

Feature layers
  features-v03*.js through features-v166*.js

Archive and verification
  archive.js
  archive-v10.js
  archive-v11.js
  archive-v13.js
  verify.js

Static app shell
  manifest.webmanifest
  service-worker.js
```

Later feature layers intentionally wrap stable earlier functions. Script order in the HTML entry points is part of the current application contract.

## Storage and transfer

Browser storage does not automatically move between devices, browser profiles, or hosting origins.

Recommended transfer sequence:

1. Save the current meeting.
2. Export a complete Workspace Backup.
3. Store it outside the browser and source device.
4. Keep private signing keys separately.
5. Run Device Readiness on the destination browser.
6. Inspect the package and run a no-write recovery drill.
7. Restore only after reviewing the mutation plan.
8. Confirm active, archived, revision, directory, template, governance, receipt, and public-key registry counts.
9. Keep the source unchanged until destination verification is complete.
10. Export a fresh backup after verification.

## Hosted-provider boundary

The current provider contract supports Promise-returning list, read, upsert, archive, restore, permanent-delete, export, and health operations with deterministic conflict tokens and idempotent replay.

Reference and rehearsal providers are disposable compatibility tools. Passing their tests does not approve a production provider.

A production Firebase, Supabase, Drive, CRM, or Methodz API provider still requires evidence for:

- authentication and server-enforced authorization;
- tenant isolation;
- encryption and credential handling;
- durable audit and retention enforcement;
- backup and recovery;
- privacy and residency review;
- incident response.

`localStorage` remains the default provider until a hosted provider is explicitly approved.

## Signing and verification

Optional ECDSA P-256 / SHA-256 signatures protect exported JSON package bytes and bound signature metadata.

Private signing keys exist only in current page memory and may be downloaded only through an explicit sensitive-backup action. Public keys may be recorded in the browser-local registry and custody workspace.

A valid signature confirms integrity relative to the matching key. It does not independently prove human identity, authority, recipient identity, approval legitimacy, delivery, or legal compliance.

## Static deployment

Supported deployment modes include:

- direct `file:` use for core meeting workflows;
- localhost;
- GitHub Pages;
- Cloudflare Pages;
- Netlify;
- Vercel static hosting;
- Render static hosting;
- any ordinary web server.

HTTPS or localhost is recommended for service-worker and Web Crypto availability.

Do not deploy this repository over `hub.methodz.ca`. Methodz Meeting Manager is a task-focused tool, not Method Hub or a business storefront container.

## Validation

GitHub Actions covers:

- JavaScript syntax and required-file wiring;
- manifest and service-worker checks;
- cryptographic signing and tamper tests;
- recovery-package validation;
- public-key custody operations;
- hosted-provider conformance;
- serialized network-fault pilot scenarios;
- offline synchronization rehearsals;
- Chromium, Firefox, and WebKit verification coverage;
- phone-viewport mobile readiness and metadata-exclusion tests.

Playwright and other test packages are installed only in CI and are not deployed runtime dependencies.

## Documentation

Primary current documents:

```text
docs/ARCHITECTURE.md
docs/MANUAL-TEST-CHECKLIST.md
docs/SECURITY-AND-PRIVACY.md
docs/RELEASE-CHECKLIST.md
docs/V1.6.1-RECOVERY-HARDENING.md
docs/V1.6.2-VERIFICATION-CONFORMANCE.md
docs/V1.6.3-PROVIDER-CONTRACT.md
docs/V1.6.4-PROVIDER-PILOT.md
docs/V1.6.5-SYNC-REHEARSAL.md
docs/V1.6.6-MOBILE-READINESS.md
docs/V1.6.6-TESTS.md
docs/PRODUCTION-PROVIDER-EVIDENCE.md
docs/KEY-CUSTODY-OPERATIONS.md
```

Earlier version-specific documents remain under `docs/` as historical engineering context.

## Roadmap

### 1.x hardening

- complete real-device Android and iOS regression testing;
- consolidate older feature layers without breaking direct-file compatibility;
- run documented cross-device recovery and key-rotation rehearsals;
- improve the direct meeting workflow before adding more infrastructure;
- evaluate production-provider candidates against the evidence gate;
- preserve browser-local storage as the default until a hosted provider is explicitly approved.

### 2.0 hosted provider

- explicitly approved Firebase, Supabase, or Methodz API provider;
- authenticated user accounts;
- server-enforced permissions and tenant isolation;
- durable organization-managed governance, retention, release, and key records;
- controlled synchronization with conflict resolution and recovery evidence.

No 2.0 provider is active in this release.
