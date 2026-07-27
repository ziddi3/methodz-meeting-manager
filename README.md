# Methodz Meeting Manager

Offline-first meeting preparation, capture, analysis, archive, recovery, and records workflows for Canadian Soft Water Corporation, Method HVAC Inc., and future partner organizations connected through the Methodz brand ecosystem.

> Methodz is a shared brand identity and operating ecosystem, not a separate company.

## Current release

**App shell 1.6.9 · Record schema 1.6.0 · Hosted-provider contract 1.0.0 · Synchronization queue package 1.0.0 · Transfer rehearsal package 1.0.0 · Transfer acceptance package 1.0.0**

The application remains a static HTML, CSS, and JavaScript system with no runtime package dependencies and no build command. Open `meeting.html` directly for core meeting workflows or deploy the repository to an ordinary static host.

Version 1.6.9 turns the completed cross-device transfer machinery into an operator acceptance workflow and improves live meeting usability:

- guided destination acceptance across records, archives, revisions, directories, templates, governance metadata, public verification keys, custody records, recovery logs, and tenant queue state;
- count comparison against the latest verified v1.6.8 destination-import report;
- explicit per-category review and typed `ACCEPT` confirmation;
- verified rollback preview and restoration of the pre-import destination snapshot;
- pre-rollback preservation of the transferred workspace;
- metadata-only acceptance, rollback, and diagnostics reports;
- compact Meeting-Day Mode with section navigation and state restoration;
- aggregate large-workspace timing, size, parsing, and quota diagnostics;
- no backend, production credential, automatic synchronization, framework, or build step.

The meeting-record schema remains `1.6.0`.

## Canonical product boundary

Methodz Meeting Manager is a task-focused meeting preparation, capture, analysis, archive, and records tool. It is not Method Hub, Nexus Hub, a storefront, a business container, the Cathedral, or a Cathedral wing.

Do not deploy this repository over `hub.methodz.ca`.

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

## Meeting-Day Mode

Meeting-Day Mode prioritizes the nine sections used during a live meeting:

1. Meeting Information
2. Organizations / Representatives Present
3. Attendance Sign-On
4. Agenda Checklist
5. Discussion Notes
6. Decisions Made
7. Follow-Up Tasks
8. Meeting Summary
9. End of Meeting

Governance, provider, recovery, synchronization, transfer, archive, and diagnostics panels remain available through **Show Supporting Panels**. The mode and last active section are restored from browser-local preferences. `Alt+M` toggles the mode.

## Cross-device transfer and acceptance

### Source

1. Save current meeting work.
2. Keep private signing keys separate.
3. Run Device Readiness.
4. Build and download the transfer bundle.
5. Store it outside the browser and source device.
6. Keep the source workspace unchanged until destination verification is complete.

### Destination transfer

1. Run Device Readiness in the destination browser profile.
2. Choose the transfer bundle.
3. Verify transfer, workspace, queue, evidence, and readiness integrity.
4. Review collision counts.
5. Run the no-write recovery drill.
6. Review the add, replace, unchanged, remove, and ignored plan.
7. Complete every destination confirmation.
8. Type `TRANSFER` and approve the final dialog.
9. Reload only after post-write verification succeeds.

### Destination acceptance

1. Run **Post-Transfer Acceptance**.
2. Review active records, Archive Vault records, revisions, directories, templates, governance metadata, public verification keys, custody records, recovery logs, and tenant queue state.
3. Resolve any count mismatch or malformed category.
4. Confirm the pre-import recovery package will be retained.
5. Type `ACCEPT` and record destination acceptance.
6. Export the metadata-only acceptance report.
7. Export a fresh destination workspace backup.

### Rollback rehearsal

1. Preview rollback without writing.
2. Review aggregate replacement counts.
3. Confirm that rollback restores the destination state that existed before transfer.
4. Type `ROLLBACK` and approve the final dialog.
5. The application preserves the transferred state as a pre-rollback recovery package.
6. The pre-import snapshot is restored and verified.
7. Reload the restored destination workspace.

Transfer and recovery packages contain business data. Protect them like complete backups. Acceptance, rollback, Device Readiness, and diagnostics reports are metadata-only and exclude meeting content, raw record IDs, attendee names, signatures, credentials, private-key material, and storage-key names.

See:

- `docs/V1.6.8-TRANSFER-REHEARSAL.md`
- `docs/V1.6.8-ARCHITECTURE.md`
- `docs/V1.6.8-TESTS.md`
- `docs/V1.6.9-TRANSFER-ACCEPTANCE.md`
- `docs/V1.6.9-ARCHITECTURE.md`
- `docs/V1.6.9-TESTS.md`
- `docs/V1.6.9-CHANGELOG.md`

## Mobile and Device Readiness

The Device Readiness panel checks browser storage, storage quota, persistent-storage status, direct-file or service-worker state, Web Crypto, connectivity, viewport fit, and aggregate workspace counts.

A **Ready** result is a capability snapshot, not proof that a protected backup exists or recovery will succeed.

The phone interface includes 44-pixel touch targets, 16-pixel mobile form controls, safe-area support, narrow-screen overflow protection, a compact action dock, and horizontally scrollable Meeting-Day section navigation.

## Large-workspace diagnostics

The v1.6.9 diagnostics panel reports:

- recognized workspace entry count;
- total measured bytes;
- largest-entry byte size without its key name;
- JSON parse-error count;
- active, archived, and revision counts;
- aggregate size buckets;
- scan duration;
- browser storage usage and quota ratio when available.

No meeting values or raw identifiers are included.

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
- Acceptance, rollback, recovery, readiness, and diagnostics reports exclude meeting and workspace values.
- Synchronization and transfer workflows never substitute for identity, delivery, authorization, or remote audit.
- Service workers cache static assets only and never process queue, transfer, acceptance, or rollback work.
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

Synchronization rehearsal and portability
  sync-rehearsal-core.js
  sync-rehearsal-hardening.js
  sync-queue-portability.js
  features-v165-sync-rehearsal.js
  features-v166-sync-portability.js

Device, transfer, and acceptance
  config-v167.js
  features-v167-device-readiness.js
  config-v168.js
  cross-device-transfer-core.js
  features-v168-transfer-rehearsal.js
  config-v169.js
  transfer-acceptance-core.js
  features-v169-transfer-acceptance.js
  features-v169-meeting-day.js

Package, custody, and recovery boundaries
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

Later feature layers intentionally wrap stable functions created by earlier layers. Script order in the HTML entry points is part of the runtime contract. See `docs/V1.6.9-ARCHITECTURE.md` for the current dependency audit and consolidation candidates.

## Synchronization rehearsal

The synchronization workspace uses a disposable, browser-local HTTP-style provider simulator. It supports explicit enqueue, preview, process, retry, discard, reconnect, conflict resolution, queue-package export/import, and completed-entry compaction.

It does not provide a production endpoint, authenticated users, server-side permissions, durable remote audit, background synchronization, production credentials, or automatic conflict resolution.

Queue import remains a no-write preview followed by explicit approval. Imported work remains unprocessed until an operator presses **Process**.

## Hosted-provider boundary

A conforming provider implements Promise-returning list, read, upsert, archive, restore, permanent-delete, export, and health operations with conflict tokens and idempotent replay.

Passing conformance proves client-contract compatibility only. A production provider still requires authentication, server-enforced authorization, tenant isolation, encryption, durable audit, retention enforcement, backup, recovery, residency review, and incident response.

See:

- `docs/V1.6.3-PROVIDER-CONTRACT.md`
- `docs/V1.6.4-PROVIDER-PILOT.md`
- `docs/PRODUCTION-PROVIDER-EVIDENCE.md`

## Signing and verification

Optional ECDSA P-256 / SHA-256 signatures protect exported JSON package bytes and bound signature metadata.

Private signing keys exist only in current page memory and may be downloaded only through an explicit sensitive-backup action. Public keys may be recorded in the browser-local registry and custody workspace.

A valid signature confirms integrity relative to the matching public key. It does not independently prove human identity, authority, recipient identity, approval legitimacy, delivery, or legal compliance.

## Static deployment

Supported modes include direct `file:` use for core meeting workflows, localhost, GitHub Pages, Cloudflare Pages, Netlify, Vercel static hosting, Render static hosting, and ordinary web servers.

HTTPS or localhost is recommended for service-worker and Web Crypto availability.

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
- v1.6.9 acceptance, rollback planning, Meeting-Day behavior, diagnostics, and narrow-phone layout;
- Chromium, Firefox, and WebKit verification coverage.

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
docs/V1.6.9-TRANSFER-ACCEPTANCE.md
docs/V1.6.9-ARCHITECTURE.md
docs/V1.6.9-TESTS.md
docs/PRODUCTION-PROVIDER-EVIDENCE.md
docs/KEY-CUSTODY-OPERATIONS.md
```

## Roadmap

### 1.x hardening

- complete real-device Android and iOS regression testing;
- execute the documented two-device transfer, acceptance, and rollback rehearsal;
- consolidate older feature layers only through regression-driven milestones;
- continue improving direct meeting capture and Meeting-Day usability;
- profile very large workspaces and refine bounded-storage warnings;
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
