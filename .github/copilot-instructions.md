# GitHub Copilot Instructions | Methodz Meeting Manager

## Canonical product identity

Methodz Meeting Manager is a task-focused, offline-first meeting preparation, capture, analysis, archive, recovery, and records application for Canadian Soft Water Corporation, Method HVAC Inc., and future partner organizations.

Methodz is a shared brand identity and operating ecosystem, not a separate company.

This repository is not Method Hub, Nexus Hub, a storefront, a business container, the Cathedral, or a Cathedral wing. Infrastructure must support the direct meeting workflow rather than replacing it. Never deploy this repository over `hub.methodz.ca`.

## Deployment contract

Maintain the application with:

- semantic HTML5;
- CSS3;
- vanilla JavaScript;
- browser `localStorage` as the default provider;
- no runtime framework;
- no required build command;
- no required network connection.

Core meeting operation must continue by opening `meeting.html` directly. Hosted PWA support may activate only on HTTPS or localhost. CI-only dependencies are allowed when they do not enter the deployed application.

## Current release boundary

```text
App shell:                   1.6.9
Record schema:               1.6.0
Hosted-provider contract:    1.0.0
Synchronization queue:       1.0.0
Transfer rehearsal package:  1.0.0
Transfer acceptance report:  1.0.0
```

Do not change the record schema merely because the app shell advances.

## Current architecture

- `meeting.html`: main meeting workspace and Meeting-Day Mode.
- `archive.html`: record detail and print surface.
- `verify.html`: standalone signed-package verifier.
- `config.js` through `config-v169.js`: ordered configuration extensions.
- `migrations.js` through `migrations-v16.js`: ordered record migrations.
- `data-adapter.js`: active synchronous browser-local provider.
- `async-data-adapter.js`: Promise compatibility wrapper.
- `attachment-adapter.js`: metadata-only attachment-reference boundary.
- `provider-contract.js`: hosted-provider contract.
- `hosted-provider-adapters.js`: disposable memory and Storage-compatible reference providers.
- `http-provider-pilot.js`: disposable serialized transport simulator.
- `sync-rehearsal-core.js`, `sync-rehearsal-hardening.js`, `sync-queue-portability.js`: explicit synchronization rehearsal protocols.
- `crypto-package-core.js`: signing and verification protocol.
- `key-custody-core.js`: public-key custody protocol.
- `workspace-package-core.js`: backup validation and recovery planning.
- `cross-device-transfer-core.js`: transfer bundle protocol.
- `transfer-acceptance-core.js`: destination acceptance, rollback planning, and aggregate diagnostics protocol.
- `app.js`: stable meeting form and record workflow.
- ordered `features-*` layers: additive browser behavior through v1.6.9.
- `manifest.webmanifest` and `service-worker.js`: optional static app shell.
- `tests/`: CI-only Node and Playwright coverage.

Preserve script order. Later layers intentionally wrap functions or inspect DOM created by earlier layers.

Required v1.6.9 order:

1. `config-v169.js` after `config-v168.js`;
2. `transfer-acceptance-core.js` after `workspace-package-core.js` and `cross-device-transfer-core.js`;
3. `features-v169-transfer-acceptance.js` after `features-v168-transfer-rehearsal.js`;
4. `features-v169-meeting-day.js` last so it can classify all supporting panels.

No core or feature module may require a network connection or mutate records during ordinary startup.

## Required product capabilities

Preserve:

- meeting information and status;
- Organizations / Representatives Present;
- attendance and meeting-specific typed signatures;
- explicit electronic-signature consent and verification metadata;
- agenda, notes, decisions, tasks, and meeting summary;
- Assigned To, priority, due date, and task status;
- templates and custom agenda items;
- attendee and organization directories;
- attachment references and attachment index;
- draft auto-save and restore;
- active-record search and edit;
- non-destructive Archive Vault;
- archive detail and print output;
- revision history, comparison, and restore;
- workspace backup, replacement restore, merge recovery, and recovery drills;
- ordered schema migration;
- classification, retention, preservation holds, redaction, approval, recipient policy, release receipt, disposition, signature, custody, and recovery metadata;
- explicit synchronization rehearsal and queue portability;
- Device Readiness and mobile usability;
- cross-device transfer with collision review and rollback on failed import;
- post-transfer destination acceptance;
- explicit restoration of the pre-import destination snapshot;
- compact Meeting-Day Mode;
- aggregate large-workspace diagnostics;
- keyboard navigation and accessibility;
- optional static hosted app shell.

## Terminology

Use:

- Organizations / Representatives Present
- Meeting Facilitator
- Follow-Up Tasks
- Assigned To
- Methodz Brand Mark
- Canadian Soft Water Corporation
- Method HVAC Inc.
- Partner-Safe Export
- Preservation Hold or Legal Hold
- Controlled Source Record
- Redacted External Copy
- Recipient-Specific Export Policy
- Policy Steward
- External Release Receipt
- Hosted-Provider Contract
- Conflict Token
- Idempotency Key
- Transfer Bundle
- Destination Acceptance
- Pre-Import Recovery Package
- Pre-Rollback Recovery Package
- Meeting-Day Mode

Avoid:

- Owner for task responsibility;
- Methodz company;
- Company logo for Methodz;
- calling a checksum or conflict token a digital signature;
- claiming a local role proves identity;
- claiming recipient policy proves recipient identity;
- claiming a release receipt proves delivery;
- claiming provider health proves authentication or durability;
- claiming conformance proves production security or legal compliance;
- claiming browser-local acceptance authenticates a person or device;
- claiming rollback evidence proves authority or legal approval;
- claiming a retention preset is legal advice.

## Governance rules

Browser-local roles, approvals, policies, receipts, typed signatures, custody events, readiness reports, synchronization events, transfer reports, acceptance reports, rollback reports, and diagnostics are workflow safeguards, not authentication.

- Preserve governance metadata through save, revision, archive, backup, merge, restore, provider, synchronization, transfer, and rollback operations.
- Do not bypass edit, export, hold, approval, review, receipt, signature, recovery, transfer, acceptance, rollback, or disposition gates without an explicit replacement policy.
- Keep archive records non-destructive by default.
- Permanent deletion remains blocked by active preservation holds.
- A future hosted provider must enforce authenticated permissions server-side.

## Signature and custody rules

- A typed signature must not save without explicit consent.
- Preserve consent statement version and timestamp.
- Do not infer consent for older signatures during migration.
- Never place signatures or consent records in reusable directory presets.
- Never include typed signatures, consent, verification, signed timestamps, or verifier details in external copies.
- Private signing JWK material is memory-only and must never enter localStorage, provider state, logs, backups, transfer bundles, acceptance reports, rollback reports, fixtures, exports, or service-worker caches.
- Public-key custody records do not automatically change registry status.
- Recalculate public-key IDs before custody import or export.

## External release rules

- External-copy generation never mutates the controlled source record.
- Prefer allow-listed output objects over copy-and-delete redaction.
- Apply recursive unsafe-key filtering after profile construction.
- Every external profile excludes signature and signature-audit data.
- Recipient policies are subtractive and run after redaction.
- A recipient policy may remove more fields but never restore removed fields.
- Approval fingerprints remain bound to recipient destination and governance version.
- Inactive or overdue policies cannot be used.
- Create a receipt only after a successful approved download.
- Route all external JSON and HTML downloads through the same receipt path.

## Package, recovery, transfer, and rollback rules

- Prefer SHA-256 through Web Crypto where available.
- Label compatibility checksums with their exact algorithm.
- A digest detects changes but does not prove identity, approval, authorship, delivery, or non-repudiation.
- Preserve unknown fields.
- Preserve a verified recovery package before replacement restore, merge, transfer import, or rollback.
- Validate packages immediately before mutation.
- Recovery, readiness, transfer, acceptance, rollback, and diagnostics reports must not contain meeting or workspace values.
- Keep the source workspace unchanged until destination verification and acceptance are complete.
- Transfer application requires explicit typed `TRANSFER` approval and final confirmation.
- Destination acceptance requires passing counts, per-category review, recovery-retention confirmation, and typed `ACCEPT`.
- Rollback requires a fresh verified preview, explicit understanding, typed `ROLLBACK`, final confirmation, and a pre-rollback package preserving the transferred state.
- Verify every rollback write and required removal.
- Restore and verify the transferred snapshot after a rollback mutation failure.
- Never move queue, transfer, acceptance, or rollback work into the service worker.

## Hosted-provider contract rules

A conforming provider implements Promise-returning list, get, upsert, archive, restore, permanent-delete, export, and health operations.

- Keep contract version `1.0.0` and schema `1.6.0` unless a deliberate migration is approved.
- Existing-record updates require the current conflict token.
- Missing or stale tokens produce non-retryable `CONFLICT`.
- Identical idempotency replays return the original result.
- Reusing a key for different input fails.
- Do not permit simultaneous active and archived copies of one ID.
- Preserve revisions and unknown fields.
- Permanent deletion requires explicit intent and cannot weaken disposition safeguards.
- Reject private key material, credentials, embedded binaries, and data URLs.
- Do not hide partial success.
- Run conformance tests only against disposable state.

A production provider must separately establish authentication, authorization, tenant isolation, encryption, secret lifecycle, durable audit, retention enforcement, backup, disaster recovery, residency, observability, and incident response.

## Meeting-Day and accessibility rules

- Meeting-Day Mode uses the existing meeting form and data model rather than a duplicate form.
- Core meeting sections remain available in workflow order.
- Supporting panels may be hidden only while the mode is active and must remain explicitly expandable.
- Dynamic section targets must be keyboard focusable.
- Navigation must work at phone and tablet widths without page-level horizontal overflow.
- Respect reduced-motion preferences.
- Keep controls keyboard reachable, visibly focused, labeled, and touch-friendly.
- Keep archive and print views readable.

## Testing and documentation

For material changes:

- run or prepare JavaScript syntax validation;
- update required-file and script-order checks;
- add portable Node tests for protocol logic;
- add Playwright coverage for browser orchestration;
- preserve earlier regression suites;
- test direct-file operation where relevant;
- document security and product boundaries;
- update README, architecture, manual checklist, changelog, and release notes when the app shell advances.

Do not merge a release with failing provider, recovery, custody, signing, synchronization, transfer, acceptance, rollback, mobile, or browser checks.
