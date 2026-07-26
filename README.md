# Methodz Meeting Manager

Offline-first meeting preparation, capture, analysis, archive, recovery, and records workflows for Canadian Soft Water Corporation, Method HVAC Inc., and future partner organizations connected through the Methodz brand ecosystem.

> Methodz is a shared brand identity and operating ecosystem, not a separate company.

## Current release

**App shell 1.6.8 · Record schema 1.6.0 · Hosted-provider contract 1.0.0 · Synchronization queue package 1.0.0 · Transfer rehearsal package 1.0.0**

The application remains a static HTML, CSS, and JavaScript system with no runtime package dependencies and no build command. Open `meeting.html` directly for core meeting workflows or deploy the repository to an ordinary static host.

Version 1.6.8 adds an explicit cross-device transfer rehearsal on top of the completed workspace recovery, queue portability, operator evidence, and Device Readiness layers:

- one integrity-checked bundle containing the workspace package, tenant queue package, metadata-only operator evidence, and metadata-only Device Readiness report;
- independent component validation plus a top-level transfer checksum;
- destination collision review across active records, Archive Vault entries, revisions, public verification keys, and queue entries;
- opaque collision references instead of raw identifiers;
- a no-write recovery drill and replacement mutation preview;
- explicit destination confirmations, typed `TRANSFER` approval, and final confirmation;
- a complete pre-import recovery package;
- staged writes followed by read-back verification;
- automatic restoration of the original destination snapshot when a staged import cannot be verified;
- bounded metadata-only rehearsal reports;
- no backend, credential, framework, build step, production provider, automatic import, or background synchronization.

The record schema remains `1.6.0`.

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
- Create summaries and export TXT, JSON, HTML, CSV, print, and PDF-compatible output.
- Reopen, revise, compare, archive, restore, search, and filter records.
- Preserve governed source records while creating controlled external copies.

## Cross-device transfer rehearsal

### Source

1. Save current meeting work.
2. Keep private signing keys separate.
3. Run Device Readiness.
4. Build and download the transfer bundle.
5. Store it outside the browser and source device.
6. Keep the source workspace unchanged until destination verification is complete.

### Destination

1. Run Device Readiness in the destination browser profile.
2. Choose the transfer bundle.
3. Verify transfer, workspace, queue, evidence, and readiness integrity.
4. Review collision counts.
5. Run the no-write recovery drill.
6. Review the add, replace, unchanged, remove, and ignored plan.
7. Complete every destination confirmation.
8. Type `TRANSFER` and approve the final dialog.
9. Reload only after post-write verification succeeds.
10. Retain the pre-import recovery package until the transfer is accepted.
11. Export a fresh destination workspace backup.

The transfer bundle contains meeting and workspace values. Protect it like a complete business backup.

The rehearsal report is metadata-only. It excludes meeting content, raw record IDs, attendee names, signatures, credentials, queue payloads, and private-key material.

See:

- `docs/V1.6.8-TRANSFER-REHEARSAL.md`
- `docs/V1.6.8-ARCHITECTURE.md`
- `docs/V1.6.8-TESTS.md`
- `docs/V1.6.8-CHANGELOG.md`

## Mobile and Device Readiness

The Device Readiness panel checks:

- browser storage write access;
- storage quota and usage estimates;
- persistent-storage status;
- direct-file or service-worker state;
- Web Crypto availability;
- online/offline state;
- page-level viewport fit;
- aggregate local workspace counts.

A **Ready** result is a capability snapshot, not proof that a protected backup exists or recovery will succeed.

The phone interface includes 44-pixel touch targets, 16-pixel mobile form controls, safe-area support, narrow-screen overflow protection, and a Save / New / Records / Device action dock.

See:

- `docs/V1.6.7-MOBILE-READINESS.md`
- `docs/V1.6.7-TESTS.md`

## Core principles

- Offline first.
- Static and directly deployable.
- No required server or runtime framework.
- Browser-local storage remains the default provider.
- Exportable records before hosted synchronization.
- Explicit confirmation before destructive or external actions.
- Non-destructive archive and revision history.
- Active preservation holds block permanent disposition.
- External downloads require matching approval metadata.
- Recipient allow-lists apply only after redaction.
- Typed signatures require consent and remain excluded from external copies.
- Private signing keys never enter browser storage, provider exports, workspace backups, transfer bundles, or signed packages.
- Workspace and transfer imports are revalidated immediately before mutation.
- Recovery, readiness, and transfer reports exclude meeting and workspace values.
- Synchronization and transfer rehearsals never substitute for approval, identity, delivery, or remote audit.
- Service workers cache static assets only and never process queue or transfer work.
- Infrastructure supports the meeting workflow rather than replacing it.

## Architecture

```text
Configuration
  config.js
  config-v11.js through config-v168.js

Schema and migration
  migrations.js
  migrations-v10.js through migrations-v16.js

Record and provider boundaries
  data-adapter.js
  async-data-adapter.js
  attachment-adapter.js
  provider-contract.js
  hosted-provider-adapters.js
  provider-conformance.js
  http-provider-pilot.js

Synchronization rehearsal and portability
  sync-rehearsal-core.js
  sync-rehearsal-hardening.js
  sync-queue-portability.js
  features-v165-sync-rehearsal.js
  features-v166-sync-portability.js

Device and transfer readiness
  config-v167.js
  features-v167-device-readiness.js
  config-v168.js
  cross-device-transfer-core.js
  features-v168-transfer-rehearsal.js

Package, custody, and recovery boundaries
  crypto-package-core.js
  key-custody-core.js
  workspace-package-core.js

Core workspace
  app.js
  features-v03*.js through features-v168*.js

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

Later feature layers intentionally wrap stable functions created by earlier layers. Script order in the HTML entry points is part of the runtime contract.

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

Queue import remains a no-write preview followed by explicit approval. Imported work remains unprocessed until an operator presses **Process**. Cross-device import preserves queue state but does not process it.

See:

- `docs/V1.6.5-SYNC-REHEARSAL.md`
- `docs/V1.6.6-SYNC-PORTABILITY.md`
- `docs/V1.6.6-TESTS.md`

## Hosted-provider boundary

A conforming provider implements Promise-returning list, read, upsert, archive, restore, permanent-delete, export, and health operations with conflict tokens and idempotent replay.

Providers must preserve active and archived separation, revisions, unknown fields, attachment references, integrity metadata, retention, holds, disposition, redaction, approval, receipts, signatures, custody, recovery, queue portability, and transfer metadata.

Private JWK material, credentials, embedded binary fields, and data URLs are rejected before provider writes and exports.

Passing conformance proves client-contract compatibility only. A production provider still requires authentication, server-enforced authorization, tenant isolation, encryption, durable audit, retention enforcement, backup, recovery, residency review, and incident response.

See:

- `docs/V1.6.3-PROVIDER-CONTRACT.md`
- `docs/V1.6.4-PROVIDER-PILOT.md`
- `docs/PRODUCTION-PROVIDER-EVIDENCE.md`

## Recovery readiness

Recovery Readiness provides fail-closed package inspection and dry recovery drills. It validates package type, checksum, entry and byte limits, unsupported keys, private JWK material, summary counts, and proposed storage mutations.

Cross-device transfer uses the same recovery boundary, creates a complete pre-import recovery package, and verifies written values before reporting success.

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

Do not deploy this repository over `hub.methodz.ca`. Methodz Meeting Manager is a task-focused tool, not Method Hub, Nexus Hub, the Cathedral, or a storefront container.

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
- cross-device transfer integrity, collisions, recovery drills, import, rollback, and metadata exclusion;
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
docs/V1.6.7-MOBILE-READINESS.md
docs/V1.6.8-TRANSFER-REHEARSAL.md
docs/V1.6.8-ARCHITECTURE.md
docs/V1.6.8-TESTS.md
docs/PRODUCTION-PROVIDER-EVIDENCE.md
docs/KEY-CUSTODY-OPERATIONS.md
```

Earlier version-specific documents remain under `docs/` as historical engineering context.

## Roadmap

### 1.x hardening

- complete real-device Android and iOS regression testing;
- complete the documented two-device transfer and rollback rehearsal;
- consolidate older feature layers without breaking direct-file compatibility;
- improve direct meeting capture and meeting-day usability;
- improve large-workspace performance and bounded-storage reporting;
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
