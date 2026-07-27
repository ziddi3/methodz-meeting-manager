# Architecture

Methodz Meeting Manager is a static, offline-first meeting preparation, capture, analysis, archive, recovery, and records application. Its infrastructure exists to support that direct meeting purpose. It is not Method Hub, Nexus Hub, a storefront, a business container, the Cathedral, or a Cathedral wing, and it must not deploy over `hub.methodz.ca`.

## Current version boundary

```text
App shell:                   1.6.9
Meeting-record schema:       1.6.0
Hosted-provider contract:    1.0.0
Synchronization queue:       1.0.0
Transfer rehearsal package:  1.0.0
Transfer acceptance report:  1.0.0
```

No server, package manager, runtime dependency, or build command is required. Core meeting workflows continue to work when `meeting.html` is opened directly.

## Entry points

```text
meeting.html   Creation, editing, Meeting-Day Mode, dashboards, governance,
               approvals, receipts, signing, recovery, transfer, acceptance,
               rollback, diagnostics, and exports
archive.html   Dedicated record detail, audit metadata, and print surface
verify.html    Standalone signed-package verification surface
```

## Runtime order

```text
meeting.html
  ├─ configuration: config.js through config-v169.js
  ├─ migrations: migrations.js through migrations-v16.js
  ├─ provider and queue protocols
  │    provider-contract.js
  │    hosted-provider-adapters.js
  │    http-provider-pilot.js
  │    sync-rehearsal-core.js
  │    sync-rehearsal-hardening.js
  │    sync-queue-portability.js
  ├─ active adapters
  │    data-adapter.js
  │    async-data-adapter.js
  │    attachment-adapter.js
  ├─ package and custody protocols
  │    crypto-package-core.js
  │    key-custody-core.js
  │    workspace-package-core.js
  │    cross-device-transfer-core.js
  │    transfer-acceptance-core.js
  ├─ app.js
  └─ ordered browser feature layers through features-v169-meeting-day.js

archive.html
  ├─ configuration through config-v169.js
  ├─ migrations through migrations-v16.js
  ├─ data and attachment adapters
  └─ archive rendering and governance layers

verify.html
  ├─ crypto-package-core.js
  └─ verify.js
```

Feature modules extend stable behavior through browser globals, function wrapping, and DOM injection. Script order is part of the application contract. Moving scripts because they appear independent can silently remove governance, revision, receipt, transfer, or recovery behavior.

## Configuration

`config.js` owns editable product defaults including branding, organizations, agendas, meeting options, numbering, governance roles, consent text, templates, and base storage keys.

```text
config-v11.js    retention, lifecycle, and redaction
config-v12.js    external approval and destinations
config-v13.js    disposition and preservation events
config-v14.js    recipient policy
config-v15.js    policy operations and release receipts
config-v16.js    signing, recovery limits, schema 1.6.0
config-v162.js   public-key custody
config-v163.js   hosted-provider contract
config-v164.js   hosted-provider pilot
config-v165.js   synchronization rehearsal
config-v166.js   queue portability
config-v167.js   mobile and Device Readiness
config-v168.js   cross-device transfer rehearsal
config-v169.js   transfer acceptance, rollback, Meeting-Day Mode, diagnostics
```

App-shell versions may advance without a record migration. `config-v169.js` keeps the schema at `1.6.0`.

## Migration

`migrations.js` owns the ordered migration registry across active records, archived records, revisions, drafts, and the original `meetingRecords` key.

```text
migrations-v10.js   governance, consent, provider, release metadata
migrations-v11.js   retention, preservation, redaction
migrations-v12.js   external release controls
migrations-v13.js   disposition and preservation chain
migrations-v14.js   recipient controls
migrations-v15.js   release receipts and policy operations
migrations-v16.js   optional external signature controls
```

Versions 1.6.1 through 1.6.9 add app-shell infrastructure and no record-schema migration. Migration functions remain ordered, idempotent, additive, and safe to repeat. They preserve unknown fields and do not invent approvals, reviews, releases, holds, disposition events, recipient policies, receipts, signatures, custody events, provider acknowledgements, synchronization outcomes, transfer acceptance, or rollback success.

## Active record adapters

### Synchronous browser-local adapter

```text
listRecords()
getRecord(recordId)
replaceRecords(records)
upsertRecord(record)
deleteRecord(recordId)
healthCheck()
```

`data-adapter.js` remains the active default provider. Browser-local storage is not silently replaced by a hosted provider.

### Promise compatibility adapter

`async-data-adapter.js` wraps the active provider with a Promise-returning compatibility boundary. It remains separate from the hosted-provider contract.

### Attachment adapter

The attachment boundary stores metadata references only. Inline binaries, `data:` payloads, and base64 meeting attachments are outside the contract.

## Hosted-provider contract

`provider-contract.js` defines Promise-returning operations:

```text
listRecords(options?)
getRecord(recordId, options?)
upsertRecord(record, options?)
archiveRecord(recordId, options?)
restoreRecord(recordId, options?)
deleteRecord(recordId, options?)
exportWorkspace(options?)
healthCheck()
```

The contract requires conflict tokens, tenant-scoped idempotency, active/archive separation, revision preservation, explicit permanent-deletion intent, structured retryability, unknown-field preservation, safe attachment references, and rejection of private JWK material, credentials, embedded binaries, and data URLs.

Reference providers and the HTTP-style pilot are disposable compatibility harnesses. Passing their tests does not establish authentication, authorization, tenant isolation, encryption, durable audit, data residency, retention enforcement, incident response, or production readiness.

## Synchronization rehearsal

The synchronization workspace is browser-local and explicit. It supports queueing, preview, processing, retry, discard, reconnect, conflict review, queue export/import, and completed-entry compaction.

It does not provide a production endpoint, authenticated users, server permissions, background synchronization, or automatic conflict resolution. Service workers never process queue work.

## Package and recovery cores

### Cryptographic package core

`crypto-package-core.js` owns canonicalization, P-256 key import/export, public-key IDs, package signing, and signature verification. Private signing material remains memory-only unless the operator explicitly downloads a sensitive backup.

### Public-key custody core

`key-custody-core.js` validates public custody manifests and records rotation, revocation, lost-key response, and recovery-rehearsal evidence. Browser-local custody metadata is process evidence, not immutable proof of identity or authority.

### Workspace package core

`workspace-package-core.js` owns:

- recognized-key filtering;
- entry and total byte limits;
- checksum verification;
- private-JWK scanning;
- workspace summaries;
- merge and replacement plans;
- no-write recovery inspection.

Browser restore, transfer, acceptance, and rollback paths use this same core.

## Cross-device transfer

`cross-device-transfer-core.js` creates and inspects a package containing:

- a complete workspace package;
- a tenant synchronization queue package;
- metadata-only operator evidence;
- metadata-only Device Readiness evidence;
- top-level integrity metadata;
- source checkpoints.

`features-v168-transfer-rehearsal.js` performs destination collision review, a no-write recovery drill, explicit typed `TRANSFER` approval, creation of a pre-import recovery package, staged writes, read-back verification, and automatic restoration of the original destination snapshot if the staged import cannot be verified.

The source remains unchanged until destination verification is complete.

## Transfer acceptance and rollback

### Portable acceptance core

`transfer-acceptance-core.js` has no direct DOM or storage dependency. It:

- packages current recognized entries with verified integrity;
- classifies active records, Archive Vault records, revisions, directories, templates, governance metadata, public verification keys, custody records, recovery logs, and tenant queue state;
- compares transfer-report counts with the destination workspace;
- verifies the pre-import recovery package;
- creates metadata-only acceptance reports;
- creates no-write rollback plans;
- creates metadata-only rollback reports;
- creates aggregate large-workspace diagnostics.

### Browser acceptance layer

`features-v169-transfer-acceptance.js` orchestrates explicit user actions:

1. run automated acceptance checks;
2. review every category;
3. confirm recovery-package retention;
4. type `ACCEPT`;
5. record bounded browser-local acceptance evidence.

Acceptance evidence does not authenticate a person or device and does not prove delivery, authority, legal approval, or identity.

### Rollback transaction

Rollback requires:

1. a verified pre-import package;
2. a fresh no-write replacement plan;
3. an understanding confirmation;
4. the typed phrase `ROLLBACK`;
5. final browser confirmation;
6. creation of a pre-rollback package preserving the transferred state.

The browser then applies the pre-import entries, verifies writes and required removals, and records aggregate evidence. If mutation fails, it restores and verifies the transferred snapshot. No rollback occurs automatically or in a service worker.

## Meeting-Day Mode

`features-v169-meeting-day.js` progressively classifies the existing form rather than creating a second meeting model. It prioritizes:

- Meeting Information;
- Organizations / Representatives Present;
- Attendance Sign-On;
- Agenda Checklist;
- Discussion Notes;
- Decisions Made;
- Follow-Up Tasks;
- Meeting Summary;
- End of Meeting.

Supporting governance, provider, recovery, synchronization, transfer, archive, and diagnostics cards are hidden only while the mode is active. They remain available through an explicit expansion control. Section IDs, keyboard focus, horizontal phone navigation, mode state, and last-section state are restored without copying record data.

## Aggregate diagnostics

The diagnostics report includes only aggregate values:

- recognized entry count;
- total and largest-entry bytes;
- JSON parse-error count;
- active, archived, and revision counts;
- size buckets;
- scan duration;
- storage usage and quota ratio when available.

It excludes meeting content, record IDs, attendee names, signatures, credentials, private keys, and storage-key names.

## External release pipeline

```text
controlled source record
  -> redaction profile
  -> recipient field allow-list
  -> policy governance version
  -> content fingerprint
  -> approval review
  -> approved package
  -> release receipt
  -> optional package signature
  -> independent verification
```

Provider synchronization, transfer, acceptance, or rollback never replaces any stage in this release pipeline.

## Data safety invariants

- Unknown record fields survive migration and provider round trips.
- Active and archived records with the same ID are not allowed.
- Revision history survives archive, restore, backup, transfer, and provider export.
- Active preservation holds block permanent disposition.
- Typed signatures and verification data remain excluded from external copies.
- Private signing keys remain absent from browser storage, provider state, exports, logs, workspace packages, transfer packages, acceptance reports, rollback reports, fixtures, and service-worker caches.
- Transfer, restore, merge, and rollback revalidate immediately before mutation.
- Acceptance, rollback, recovery, readiness, and diagnostics reports are metadata-only.
- Service workers cache application assets only.
- Provider health, checksums, conflict tokens, and browser-local evidence do not prove authentication, identity, authority, delivery, or legal approval.

## Script-order audit and consolidation

Safe candidates for a future regression-driven consolidation milestone:

- HTML escaping and JSON download helpers;
- recognized-key collection;
- bounded metadata-report persistence;
- workspace-limit normalization;
- repeated metadata-boundary declarations.

Do not casually consolidate:

- save wrappers and revision creation;
- migration order;
- archive/disposition overrides;
- external release and receipt routing;
- transfer application;
- rollback transactions;
- governance and preservation gates.

These areas rely on ordered wrapping and require dedicated regression coverage before refactoring.

## Validation

GitHub Actions runs:

1. syntax and required-file checks;
2. app-shell, manifest, canon-boundary, and service-worker checks;
3. cryptographic, recovery, custody, synchronization, transfer, and acceptance Node tests;
4. hosted-provider conformance;
5. browser regression, transfer acceptance, Meeting-Day, diagnostics, mobile, and portable-signature suites;
6. Chromium, Firefox, and WebKit where applicable.

Test-only packages are installed in CI and are not deployed with the static application.
