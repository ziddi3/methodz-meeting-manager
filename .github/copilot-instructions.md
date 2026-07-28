# GitHub Copilot Instructions | Methodz Meeting Manager

## Product identity

Methodz Meeting Manager is a task-focused, offline-first meeting preparation, capture, analysis, archive, recovery, transfer, follow-up, and records application for Canadian Soft Water Corporation, Method HVAC Inc., and future partner organizations.

Methodz is a shared brand identity and operating ecosystem, not a separate company.

This repository is not Method Hub, Nexus Hub, a storefront, a business container, the Cathedral, or a Cathedral wing. Never deploy it over `hub.methodz.ca`.

Read the canonical governance documents in `ziddi3/methodz-nexus-canon` before architectural work. Do not invent ecosystem boundaries when a local canon snapshot is absent.

## Deployment contract

Maintain:

- semantic HTML5, CSS3, and vanilla JavaScript;
- browser `localStorage` as the default provider;
- no runtime framework;
- no required build command;
- no required network connection;
- direct-file core meeting operation through `meeting.html`.

Hosted PWA behavior may activate only on HTTPS or localhost. CI-only dependencies must not enter the deployed runtime.

## Current release boundary

```text
App shell:                   1.6.11
Record schema:               1.6.0
Meeting review core:         1.0.0
Hosted-provider contract:    1.0.0
Synchronization queue:       1.0.0
Transfer package:            1.0.0
Acceptance report:           1.0.0
Panel registry:              1.0.0
```

Do not change the record schema merely because the app shell advances.

## Architecture

- `meeting.html`: main meeting workspace.
- `archive.html`: record detail and print surface.
- `verify.html`: standalone signed-package verifier.
- `config.js` through `config-v1611.js`: ordered configuration layers.
- `migrations.js` through `migrations-v16.js`: ordered record migrations.
- `data-adapter.js`: active browser-local provider.
- `async-data-adapter.js`: Promise compatibility layer.
- `attachment-adapter.js`: metadata-only attachment boundary.
- `provider-contract.js`: hosted-provider contract.
- `hosted-provider-adapters.js`: disposable reference providers.
- `http-provider-pilot.js`: disposable transport simulator.
- synchronization, signing, custody, recovery, transfer, and acceptance cores.
- `panel-registry-core.js`: portable shell metadata and validation.
- `panel-registry-definitions.js`: current panel declarations.
- `meeting-review-core.js`: side-effect-free pulse and follow-up derivation.
- `features-v1611-follow-up-review.js`: browser review workspace.
- `features-v1610-panel-registry.js`: browser binding and visible diagnostics.
- `app.js`: stable meeting form and record workflow.
- ordered `features-*` layers: additive browser behavior.
- `manifest.webmanifest` and `service-worker.js`: optional static app shell.

Script order is part of the runtime contract. Do not reorder modules because they appear independent.

Required v1.6.11 order:

1. `config-v1611.js` after `config-v1610.js`;
2. portable cores before browser features;
3. earlier feature layers create historical dynamic panels;
4. `features-v1611-follow-up-review.js` creates Meeting Pulse and Follow-Up Review;
5. `features-v1610-panel-registry.js` binds the completed shell and performs a deferred compatibility pass;
6. `features-v169-meeting-day.js` consumes registry metadata last.

No feature module may require a network connection or mutate records during ordinary startup.

## Panel registry rules

Every registered panel may declare:

```text
id
label
group
selector
insertionAnchor
meetingDayPriority
meetingDayLabel
defaultVisibility
printBehavior
required
order
```

Required behavior:

- reject duplicate IDs and invalid metadata;
- require stable selectors and insertion anchors;
- register every direct capture panel;
- fail visibly if a required capture panel is missing;
- fail closed when Meeting-Day priority differs from DOM order;
- never hide meeting or recovery controls after registry failure;
- keep diagnostics metadata-only;
- use headings only as a compatibility fallback;
- rebind after dynamic startup panels are available.

The registry is shell metadata and validation, not a record provider, router, permission system, or backend.

## Required product capabilities

Preserve:

- meeting information and status;
- Organizations / Representatives Present;
- attendance, explicit consent, and typed signatures;
- agenda, notes, decisions, tasks, and summary;
- **Assigned To** responsibility labels;
- read-only Meeting Pulse and next-incomplete navigation;
- explicit saved-record Follow-Up Review and source-meeting opening;
- templates, directories, and attachment references;
- draft restore, search, import, export, and print;
- revisions and non-destructive Archive Vault;
- workspace backup, recovery drills, replacement restore, and merge recovery;
- classification, retention, preservation, disposition, redaction, approval, recipient policy, and release receipts;
- package signing with memory-only private keys;
- public-key custody workflows;
- explicit synchronization rehearsal and queue portability;
- Device Readiness and mobile controls;
- cross-device transfer, destination acceptance, and pre-import rollback;
- Meeting-Day Mode;
- panel-registry diagnostics and field-rehearsal evidence.

## Terminology

Use **Organizations / Representatives Present**, **Meeting Facilitator**, **Follow-Up Tasks**, **Assigned To**, **Methodz Brand Mark**, **Controlled Source Record**, **Redacted External Copy**, **Preservation Hold**, **Recipient-Specific Export Policy**, **External Release Receipt**, **Conflict Token**, **Idempotency Key**, **Transfer Bundle**, **Destination Acceptance**, **Pre-Import Recovery Package**, **Pre-Rollback Recovery Package**, **Meeting-Day Mode**, **Meeting Pulse**, **Follow-Up Review**, and **Panel Registry**.

Avoid “Owner” for task responsibility, “Methodz company,” “Company logo” for Methodz, calling a checksum a digital signature, or claiming browser-local workflow metadata proves identity, authority, delivery, approval, device identity, or production durability.

## Governance and signature rules

Browser-local roles, approvals, policies, receipts, typed signatures, custody events, readiness results, transfer reports, acceptance reports, rollback reports, review reports, registry diagnostics, and field evidence are workflow safeguards, not authentication.

- Preserve governance metadata through save, revision, archive, backup, merge, restore, provider, synchronization, transfer, acceptance, and rollback.
- Do not bypass edit, export, hold, approval, review, receipt, signature, recovery, transfer, acceptance, rollback, or disposition gates without an explicit replacement policy.
- Keep archive records non-destructive by default.
- Permanent deletion remains blocked by active preservation holds.
- Typed signatures require explicit consent.
- Never place signatures or consent records in reusable directory presets.
- Never include typed signatures or verification data in external copies.
- Private signing material must never enter storage, providers, backups, transfer packages, reports, fixtures, logs, or service-worker caches.

## Review rules

- `meeting-review-core.js` must remain portable, deterministic, and side-effect free.
- Pulse rendering must never save, change status, or mutate a meeting.
- Follow-up classification must use strict date-only validation.
- Opening a source meeting requires an explicit operator action.
- Review exports require an explicit action and must exclude signatures, consent details, credentials, private keys, provider secrets, queue payloads, and hidden governance metadata.
- Do not send reminders, contact assignees, update task status, or synchronize review data automatically.

## Package, transfer, and rollback rules

- Prefer SHA-256 through Web Crypto where available and label compatibility checksums accurately.
- Preserve unknown fields.
- Preserve a verified recovery package before replacement restore, merge, transfer import, or rollback.
- Validate packages immediately before mutation.
- Keep source work unchanged until destination verification and acceptance complete.
- Transfer requires typed `TRANSFER` approval and final confirmation.
- Acceptance requires matching counts, per-category review, recovery retention, and typed `ACCEPT`.
- Rollback requires verified preview, explicit understanding, typed `ROLLBACK`, final confirmation, and a pre-rollback package.
- Verify every rollback write and required removal.
- Restore and verify the transferred snapshot after rollback failure.
- Never move queue, transfer, acceptance, rollback, registry, review, or field-rehearsal work into the service worker.

## Hosted-provider rules

A conforming provider implements Promise-returning list, get, upsert, archive, restore, permanent-delete, export, and health operations.

- Existing-record updates require the current conflict token.
- Identical idempotency replays return the original result.
- Reusing a key for different input fails.
- Do not permit simultaneous active and archived copies of one ID.
- Preserve revisions and unknown fields.
- Permanent deletion requires explicit intent.
- Reject private key material, credentials, embedded binaries, and data URLs.
- Do not hide partial success.
- Run conformance tests only against disposable state.

Passing conformance does not establish authentication, authorization, tenant isolation, encryption, durable audit, residency, or legal compliance.

## Accessibility and mobile rules

- Use the existing meeting form and data model.
- Resolve core sections through the registry when available.
- Supporting panels may collapse only after valid registry diagnostics.
- Registry failure must be visible and leave controls accessible.
- Dynamic targets must be keyboard focusable.
- Navigation must use stable panel IDs with compatibility fallbacks.
- Phone and tablet widths must not create page-level overflow.
- Respect reduced-motion preferences.
- Keep controls keyboard reachable, visibly focused, labeled, and touch friendly.

## Testing and documentation

For material changes:

- run JavaScript syntax validation;
- update required-file and script-order checks;
- add portable Node tests for protocol logic;
- add Playwright coverage for browser orchestration;
- preserve earlier regression suites;
- test direct-file operation where relevant;
- document product and security boundaries;
- update README, project specification, architecture, test plan, changelog, and field-rehearsal materials when the shell advances.

Do not merge with failing provider, recovery, custody, signing, synchronization, transfer, acceptance, rollback, review, panel-registry, mobile, or browser checks.
