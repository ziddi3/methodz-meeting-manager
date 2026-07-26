# Methodz Meeting Manager

Offline-first meeting preparation, capture, analysis, archive, and records for Canadian Soft Water Corporation, Method HVAC Inc., and future partner workflows connected through the Methodz brand ecosystem.

> Methodz is a shared brand identity and operating ecosystem, not a separate company.

## Current release

**App shell 1.6.7 · Record schema 1.6.0 · Hosted-provider contract 1.0.0 · Synchronization queue package 1.0.0**

The application remains a static HTML, CSS, and JavaScript system with no runtime package dependencies and no build command. Open `meeting.html` directly for the core meeting workflow or deploy the repository to an ordinary static host.

Version 1.6.7 adds mobile and cross-device readiness without replacing the completed v1.6.6 synchronization portability layer:

- metadata-only browser storage, quota, persistence, service-worker, Web Crypto, connection, and viewport checks;
- aggregate active, archived, revision, draft, template, directory, and rehearsal-queue counts;
- an explicit persistent-storage request;
- a downloadable readiness report that excludes meeting content, record IDs, names, signatures, credentials, and key material;
- a cross-device transfer checklist;
- a phone action dock for Save, New, Records, and Device;
- 44-pixel touch targets, 16-pixel mobile form controls, safe-area support, and narrow-screen overflow protection;
- dedicated phone-viewport Playwright coverage;
- no production endpoint, credential, backend, framework, build step, or automatic synchronization.

The v1.6.6 synchronization layer remains intact with tenant-scoped queues, integrity-checked export/import, no-write preview, explicit approval, merge strategies, protected compaction, reload recovery, and metadata-only operator evidence.

## Entry points

```text
meeting.html   Main meeting workspace
archive.html   Dedicated detail and print view
verify.html    Standalone signed-package verifier
```

## Direct meeting workflow

- Create and edit meeting information.
- Select organizations and representatives present.
- Capture attendance, consent, and typed signatures.
- Work through agenda items and discussion notes.
- Record decisions and follow-up tasks.
- Assign responsibility with **Assigned To**, never “Owner.”
- Create summaries, print records, and export TXT, JSON, HTML, CSV, and PDF-compatible output.
- Reopen, revise, compare, archive, restore, search, and filter records.
- Preserve governed source records while creating controlled external copies.

## Mobile and cross-device readiness

The Device Readiness panel reports whether the current browser context can safely support the local workflow. It checks:

- browser storage write access;
- storage quota and usage estimates;
- persistent-storage status;
- direct-file or service-worker state;
- Web Crypto availability;
- online/offline state;
- page-level viewport fit;
- aggregate local workspace counts.

A **Ready** result is a capability snapshot, not proof that a backup exists or that recovery will succeed.

Recommended transfer sequence:

1. Save the current meeting.
2. Export a complete Workspace Backup.
3. Store it outside the browser and source device.
4. Keep private signing keys separate from backups and signed packages.
5. Run Device Readiness on the destination browser.
6. Inspect the package and run a no-write recovery drill.
7. Restore only after reviewing the mutation plan.
8. Confirm active, archived, revision, directory, template, governance, receipt, key-registry, and queue counts.
9. Keep the source unchanged until destination verification is complete.
10. Export a fresh backup after verification.

See:

- `docs/V1.6.7-MOBILE-READINESS.md`
- `docs/V1.6.7-TESTS.md`

## Core principles

- Offline first.
- Static and directly deployable.
- No required server or runtime framework.
- Browser-local storage remains the default provider.
- Exportable records before hosted synchronization.
- Explicit confirmation before destructive actions.
- Non-destructive archive and revision history.
- Active preservation holds block permanent disposition.
- External downloads require matching approval metadata.
- Recipient allow-lists apply only after redaction.
- Typed signatures require consent and remain excluded from external copies.
- Private signing keys never enter browser storage, provider exports, workspace backups, or signed packages.
- Workspace imports are validated immediately before mutation.
- Recovery and readiness reports exclude meeting and workspace values.
- Synchronization rehearsal never substitutes for approval, identity, delivery, or remote audit.
- Service workers cache static assets only and never process queue work.
- Infrastructure supports the meeting workflow rather than replacing it.

## Architecture

```text
Configuration
  config.js
  config-v11.js through config-v167.js

Schema and migration
  migrations.js
  migrations-v10.js through migrations-v16.js

Record providers
  data-adapter.js
  async-data-adapter.js
  provider-contract.js
  hosted-provider-adapters.js
  provider-conformance.js

Disposable provider pilot
  http-provider-pilot.js
  tests/v164-provider-pilot.mjs

Synchronization rehearsal and portability
  sync-rehearsal-core.js
  sync-rehearsal-hardening.js
  features-v165-sync-rehearsal.js
  sync-queue-portability.js
  features-v166-sync-portability.js

Mobile and device readiness
  config-v167.js
  features-v167-device-readiness.js
  features-v167.css
  tests/v167-mobile-readiness.spec.js

Package, custody, and recovery boundaries
  crypto-package-core.js
  key-custody-core.js
  workspace-package-core.js

Core workspace
  app.js
  features-v03*.js through features-v167*.js

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

Later feature layers intentionally wrap stable functions created by earlier layers. Script order in the HTML entry points is part of the application contract.

## Synchronization rehearsal

The synchronization workspace uses a disposable, browser-local HTTP-style provider simulator. It supports explicit enqueue, preview, process, retry, discard, reconnect, conflict resolution, queue-package export/import, and completed-entry compaction.

It does **not** provide:

- a production endpoint;
- authenticated users;
- server-side permissions;
- durable remote audit;
- background synchronization;
- production credentials;
- automatic conflict resolution.

Queue import remains a no-write preview followed by explicit approval. Imported work remains unprocessed until an operator presses **Process**. Device Readiness reports the queue count only and never exports queue contents.

See:

- `docs/V1.6.5-SYNC-REHEARSAL.md`
- `docs/V1.6.6-SYNC-PORTABILITY.md`
- `docs/V1.6.6-TESTS.md`

## Hosted-provider boundary

A conforming provider implements Promise-returning list, read, upsert, archive, restore, permanent-delete, export, and health operations with conflict tokens and idempotent replay.

Providers must preserve active and archived separation, revisions, unknown fields, attachment references, integrity metadata, retention, holds, disposition, redaction, approval, receipts, signatures, custody, recovery, and queue portability metadata.

Private JWK material, credentials, embedded binary fields, and data URLs are rejected before provider writes and exports.

Passing conformance proves client-contract compatibility only. A production provider still requires authentication, server-enforced authorization, tenant isolation, encryption, durable audit, retention enforcement, backup, recovery, residency review, and incident response.

See:

- `docs/V1.6.3-PROVIDER-CONTRACT.md`
- `docs/V1.6.4-PROVIDER-PILOT.md`
- `docs/PRODUCTION-PROVIDER-EVIDENCE.md`

## Recovery readiness

The Recovery Readiness panel provides no-write package inspection and dry recovery drills. It validates package type, checksum, entry and byte limits, unsupported keys, private JWK material, summary counts, and the proposed storage mutation plan.

Browser storage does not automatically move between devices, browser profiles, or hosting origins. Device Readiness complements recovery planning but does not replace a protected off-device backup.

See `docs/V1.6.1-RECOVERY-HARDENING.md`.

## Signing and verification

Optional ECDSA P-256 / SHA-256 signatures protect exported JSON package bytes and bound signature metadata.

Private signing keys exist only in current page memory and may be downloaded only through an explicit sensitive-backup action. Public keys may be recorded in the browser-local registry and custody workspace.

A valid signature confirms integrity relative to the matching public key. It does not independently prove human identity, authority, recipient identity, approval legitimacy, delivery, or legal compliance.

See:

- `docs/KEY-CUSTODY-OPERATIONS.md`
- `docs/V1.6.2-VERIFICATION-CONFORMANCE.md`

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

## Automated validation

GitHub Actions covers:

- JavaScript syntax and required-file wiring;
- manifest and service-worker boundaries;
- cryptographic signing and tamper tests;
- recovery-package validation;
- public-key custody operations;
- hosted-provider conformance;
- serialized network-fault pilot scenarios;
- synchronization rehearsal and queue portability;
- Chromium, Firefox, and WebKit verification coverage;
- phone-viewport overflow, touch-target, navigation, and metadata-exclusion tests.

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
docs/V1.6.6-SYNC-PORTABILITY.md
docs/V1.6.6-TESTS.md
docs/V1.6.7-MOBILE-READINESS.md
docs/V1.6.7-TESTS.md
docs/PRODUCTION-PROVIDER-EVIDENCE.md
docs/KEY-CUSTODY-OPERATIONS.md
```

Earlier version-specific documents remain under `docs/` as historical engineering context.

## Roadmap

### 1.x hardening

- complete real-device Android and iOS regression testing;
- consolidate older feature layers without breaking direct-file compatibility;
- run documented cross-device recovery, queue-transfer, and key-rotation rehearsals;
- improve the direct meeting workflow before adding more infrastructure;
- evaluate production-provider candidates against the evidence gate;
- keep synchronization explicit and user-controlled;
- preserve browser-local storage as the default until a hosted provider is explicitly approved.

### 2.0 hosted provider

- explicitly approved Firebase, Supabase, or Methodz API provider;
- authenticated user accounts;
- server-enforced permissions and tenant isolation;
- durable organization-managed governance, retention, release, and key records;
- controlled synchronization with conflict resolution and recovery evidence;
- calendar and CRM integration;
- AI-assisted summaries with explicit human review;
- audio or video recording workflows with consent controls.

No 2.0 provider is active in this release.
