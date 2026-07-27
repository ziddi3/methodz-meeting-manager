# Methodz Meeting Manager

Offline-first meeting preparation, capture, analysis, archive, recovery, and records workflows for Canadian Soft Water Corporation, Method HVAC Inc., and future partner organizations connected through the Methodz brand ecosystem.

> Methodz is a shared brand identity and operating ecosystem, not a separate company.

## Current release

**App shell 1.6.9 · Record schema 1.6.0 · Hosted-provider contract 1.0.0 · Synchronization queue package 1.0.0 · Transfer rehearsal package 1.0.0**

The application remains plain HTML, CSS, and JavaScript with no required runtime packages and no build command. Open `meeting.html` directly for core meeting workflows or deploy the repository to any ordinary static host.

Version 1.6.9 completes the operator workflow around the v1.6.8 cross-device transfer layer and sharpens live meeting usability:

- post-transfer acceptance checklist for active records, Archive Vault records, revisions, directories, templates, governance metadata, public verification keys, custody records, recovery logs, and tenant queue state;
- bounded metadata-only acceptance evidence;
- explicit pre-import rollback rehearsal with checksum validation, no-write preview, typed `ROLLBACK` approval, recovery creation, exact read-back verification, and automatic restoration after failed writes;
- aggregate large-workspace diagnostics without meeting content, storage values, storage-key names, or raw identifiers;
- compact Meeting-Day Mode with section navigation and state restoration for phone and tablet use;
- two-browser-profile automated transfer, acceptance, diagnostics, and rollback coverage;
- documented script-order audit and safe future consolidation path;
- no backend, credential, framework, build step, production provider, automatic acceptance, automatic rollback, or background synchronization.

The meeting-record schema remains `1.6.0`.

## Entry points

```text
meeting.html   Main meeting and operator workspace
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

## Meeting-Day Mode

Meeting-Day Mode keeps the live capture route in front:

```text
Meeting Information
Organizations / Representatives Present
Attendance
Agenda
Notes
Decisions
Tasks
Summary
Save
```

Supporting governance, recovery, provider, synchronization, and transfer panels are collapsed rather than removed. **Show Tools** reopens them at any time. The last meeting section and mode preference are restored locally after reload.

The section navigator is optimized for narrow screens with touch-sized controls and horizontal scrolling. `Alt+M` toggles Meeting-Day Mode when focus is outside a form field.

## Cross-device transfer and acceptance

### Source

1. Save current meeting work.
2. Keep private signing keys separate.
3. Run Device Readiness.
4. Build and download the v1.6.8 transfer bundle.
5. Store it outside the browser and source device.
6. Keep the source unchanged until destination verification and acceptance are complete.

### Destination import

1. Run Device Readiness.
2. Choose the transfer bundle.
3. Verify transfer, workspace, queue, evidence, and readiness integrity.
4. Review collision counts.
5. Run the no-write recovery drill.
6. Review the replacement plan.
7. Complete every destination confirmation.
8. Type `TRANSFER` and approve the final dialog.
9. Reload only after post-write verification succeeds.

### Destination acceptance

1. Open **Transfer Acceptance & Rollback**.
2. Refresh the aggregate destination review.
3. Compare all ten component groups with the expected source.
4. Review every checklist item.
5. Complete acceptance and retain the metadata-only report.
6. Run aggregate workspace diagnostics.
7. Export a fresh destination workspace backup.
8. Keep the pre-import package until the transfer has been accepted in actual use.

### Rollback rehearsal

1. Press **Preview Rollback**.
2. Verify the pre-import package and review add, replace, unchanged, remove, and ignored counts.
3. Confirm review and type `ROLLBACK`.
4. Approve the final replacement dialog.
5. The current destination is preserved as a separate rollback-recovery package.
6. The pre-import snapshot is restored and read back.
7. Reload only after verification succeeds.

The transfer bundle contains meeting and workspace values. Protect it like a complete business backup.

Acceptance, diagnostics, rollback, readiness, and rehearsal reports are metadata-only. They exclude meeting content, raw record identifiers, attendee names, signatures, credentials, queue payloads, and private-key material.

See:

- `docs/V1.6.8-TRANSFER-REHEARSAL.md`
- `docs/V1.6.9-TRANSFER-ACCEPTANCE.md`
- `docs/V1.6.9-ARCHITECTURE.md`
- `docs/V1.6.9-TESTS.md`

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

The phone interface includes touch-sized controls, mobile-safe form sizing, safe-area support, narrow-screen overflow protection, an action dock, Meeting-Day Mode, and a section navigator.

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
- Private signing keys never enter browser storage, provider exports, workspace backups, transfer bundles, or reports.
- Workspace, transfer, acceptance, and rollback operations are revalidated immediately before mutation.
- Recovery and operational reports exclude meeting and workspace values.
- Synchronization and transfer rehearsals never substitute for approval, identity, delivery, or remote audit.
- Service workers cache static assets only and never process workspace, queue, transfer, acceptance, or rollback work.
- Infrastructure supports the meeting workflow rather than replacing it.

## Architecture

```text
Configuration
  config.js
  config-v11.js through config-v169.js

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

Synchronization and queue portability
  sync-rehearsal-core.js
  sync-rehearsal-hardening.js
  sync-queue-portability.js
  features-v165-sync-rehearsal.js
  features-v166-sync-portability.js

Device, transfer, and acceptance
  features-v167-device-readiness.js
  cross-device-transfer-core.js
  features-v168-transfer-rehearsal.js
  transfer-acceptance-core.js
  features-v169-transfer-acceptance.js
  features-v169-meeting-day.js

Package, custody, and recovery
  crypto-package-core.js
  key-custody-core.js
  workspace-package-core.js

Core workspace
  app.js
  features-v03*.js through features-v169*.js

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

Later layers intentionally extend stable functions created by earlier layers. Script order in the HTML entry points is part of the runtime contract. See `docs/V1.6.9-SCRIPT-ORDER-AUDIT.md`.

## Synchronization rehearsal

The synchronization workspace uses a disposable, browser-local HTTP-style provider simulator. It supports explicit enqueue, preview, process, retry, discard, reconnect, conflict resolution, queue-package export/import, completed-entry compaction, and transfer rehearsal.

It does **not** provide a production endpoint, authenticated users, server-side permissions, durable remote audit, background synchronization, production credentials, or automatic conflict resolution.

Queue import remains a no-write preview followed by explicit approval. Imported work remains unprocessed until an operator presses **Process**.

## Hosted-provider boundary

A conforming provider implements Promise-returning list, read, upsert, archive, restore, permanent-delete, export, and health operations with conflict tokens and idempotent replay.

Passing conformance proves client-contract compatibility only. A production provider still requires authentication, server-enforced authorization, tenant isolation, encryption, durable audit, retention enforcement, backup, recovery, residency review, and incident response.

No production provider is active in this release.

## Signing and verification

Optional ECDSA P-256 / SHA-256 signatures protect exported JSON package bytes and bound signature metadata.

Private signing keys exist only in current page memory and may be downloaded only through an explicit sensitive-backup action. Public keys may be recorded in the browser-local registry and custody workspace.

A valid signature confirms integrity relative to the matching public key. It does not independently prove human identity, authority, recipient identity, approval legitimacy, delivery, or legal compliance.

## Static deployment

Supported modes include:

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
- hosted-provider conformance and network-fault pilots;
- synchronization rehearsal and queue portability;
- cross-device transfer integrity, collisions, import, and rollback;
- v1.6.9 acceptance, diagnostics, and pre-import restoration;
- Chromium, Firefox, and WebKit verification coverage;
- phone viewport, touch target, navigation, and metadata-exclusion tests.

Playwright and other test packages are installed only in CI and are not deployed runtime dependencies.

## Current documentation

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
docs/V1.6.9-TRANSFER-ACCEPTANCE.md
docs/V1.6.9-ARCHITECTURE.md
docs/V1.6.9-TESTS.md
docs/V1.6.9-SCRIPT-ORDER-AUDIT.md
docs/PRODUCTION-PROVIDER-EVIDENCE.md
docs/KEY-CUSTODY-OPERATIONS.md
```

## Roadmap

### 1.x hardening

- complete real-device Android and iOS regression testing;
- execute the documented physical two-device transfer, acceptance, and rollback rehearsal;
- introduce a non-breaking panel registry before consolidating older feature layers;
- improve live meeting capture and follow-up review;
- continue large-workspace performance and bounded-storage testing;
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
