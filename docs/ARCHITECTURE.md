# Architecture

Methodz Meeting Manager is a static, offline-first meeting-record application. The design keeps the workflow inspectable and directly deployable while defining replaceable boundaries for records, attachment references, migration, revision history, archive lifecycle, recovery, governance, retention, redaction, approval, disposition, recipient policy, release receipts, cryptographic signatures, key custody, and future hosted providers.

## Entry points

```text
meeting.html   Creation, editing, dashboards, governance, approvals,
               receipts, signing, verification, recovery, and exports
archive.html   Dedicated record detail, audit metadata, and print surface
verify.html    Standalone signed-package verification surface
```

No server, package manager, runtime dependency, or build command is required. Core meeting workflows must continue to work when `meeting.html` is opened directly.

## Runtime model

```text
meeting.html
  ├─ config.js
  ├─ config-v11.js through config-v16.js
  ├─ config-v162.js
  ├─ config-v163.js
  ├─ migrations.js
  ├─ migrations-v10.js through migrations-v16.js
  ├─ provider-contract.js
  ├─ hosted-provider-adapters.js
  ├─ data-adapter.js
  ├─ async-data-adapter.js
  ├─ attachment-adapter.js
  ├─ crypto-package-core.js
  ├─ key-custody-core.js
  ├─ workspace-package-core.js
  ├─ app.js
  └─ ordered feature layers

archive.html
  ├─ ordered configuration and migration layers
  ├─ data-adapter.js
  ├─ attachment-adapter.js
  └─ archive rendering and governance layers

verify.html
  ├─ crypto-package-core.js
  └─ verify.js
```

Feature modules extend the stable core through browser globals, function wrapping, and DOM injection. Script order is part of the application contract.

Configuration extensions load before the migration registry. This preserves record schema `1.6.0` while allowing app-shell `1.6.3` provider configuration without a record migration.

## Configuration

`config.js` owns stable editable defaults including brand labels, logo paths, organizations, agenda groups, meeting options, numbering, governance roles, consent text, and base storage keys.

```text
config-v11.js    retention, lifecycle, redaction
config-v12.js    external approval and destinations
config-v13.js    disposition and preservation events
config-v14.js    recipient policy
config-v15.js    policy operations and release receipts
config-v16.js    signing and recovery limits, schema 1.6.0
config-v162.js   public-key custody and app shell 1.6.2
config-v163.js   hosted-provider contract and app shell 1.6.3
```

## Migration

`migrations.js` owns the ordered registry and migration across active records, archived records, revisions, drafts, and the original `meetingRecords` key.

```text
migrations-v10.js   governance, consent, provider, release metadata
migrations-v11.js   retention, preservation, redaction
migrations-v12.js   external release controls
migrations-v13.js   disposition and preservation chain
migrations-v14.js   recipient controls
migrations-v15.js   release receipts and policy operations
migrations-v16.js   optional external signature controls
```

Version 1.6.3 adds no migration. Migration functions remain ordered, idempotent, additive, and safe to repeat. They must preserve unknown fields and must not invent approvals, reviews, releases, holds, disposition events, recipient policies, receipts, signatures, custody events, or provider acknowledgements.

## Provider boundaries

### Synchronous browser-local adapter

```text
listRecords()
getRecord(recordId)
replaceRecords(records)
upsertRecord(record)
deleteRecord(recordId)
healthCheck()
```

`data-adapter.js` remains the active application provider in v1.6.3.

### Legacy async wrapper

`async-data-adapter.js` preserves the earlier Promise-based compatibility boundary and continues to wrap the active local adapter. It is not silently replaced in v1.6.3.

### Hosted-provider contract

`provider-contract.js` defines the versioned portable contract:

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

The contract adds:

- deterministic expected conflict tokens;
- idempotency-key replay and misuse protection;
- active versus Archive Vault separation;
- revision preservation;
- explicit permanent deletion intent;
- structured errors and retryability metadata;
- complete provider export packages;
- private-key rejection before export.

`hosted-provider-adapters.js` contains disposable in-memory and Storage-compatible local reference providers. Loading the module does not instantiate tests or mutate records.

`provider-conformance.js` contains one reusable suite run against both reference providers. CI uses isolated storage objects and keys, never active user storage.

### Attachment references

```text
listReferences(record)
getReference(record, referenceId)
upsertReference(record, reference)
deleteReference(record, referenceId)
validateReference(reference)
healthCheck()
```

The current attachment boundary stores metadata references only and rejects inline binary payloads. Binary transfer is outside the hosted-provider 1.0.0 contract.

## Conflict and idempotency model

Stored hosted-provider records receive:

```text
providerMetadata.contractVersion
providerMetadata.version
providerMetadata.conflictToken
```

The token is derived from canonical JSON and provider version. It is a concurrency token, not a digital signature.

Existing records may be updated only with the current token. Missing or stale tokens fail with a non-retryable `CONFLICT` error.

Accepted writes may include an idempotency key. Replaying the same request returns the original result. Reusing the key with different input fails with `IDEMPOTENCY_CONFLICT`. A production provider must scope idempotency by tenant and operation.

## Provider error model

`ProviderError` exposes:

```text
code
retryable
operation
providerId
details
```

Temporary partial failure, unavailability, and rate limiting may be retryable. Validation, conflict, authority, integrity, and private-key rejection failures are not retryable until the request or security context changes.

A provider must not hide partial success. Safe completion and failure counts may appear in error details, but meeting values, credentials, private keys, and sensitive payloads must not enter logs.

## Provider export model

Hosted-provider exports contain:

```text
packageType
packageVersion
providerContractVersion
providerId
exportedAt
activeRecords
archivedRecords
revisions
metadata
integrity
```

The package preserves unknown fields and existing recovery, signature, redaction, approval, retention, hold, disposition, receipt, and integrity metadata.

The portable core rejects private EC JWK `d` parameters and recognized private-key fields before export. The built-in FNV-1a canonical value provides direct-file-compatible change detection, not cryptographic identity or non-repudiation. Optional ECDSA package signing remains a separate layer.

## Portable package cores

### Cryptographic package core

`crypto-package-core.js` owns canonicalization, key import/export, public-key IDs, package signing, and verification. Private signing material remains memory-only.

### Key custody core

`key-custody-core.js` owns public custody manifests and validation for rotation, revocation, lost-key response, and recovery rehearsal evidence.

### Workspace package core

`workspace-package-core.js` owns backup inspection, limits, private-key detection, checksum verification, restore planning, and recovery reports.

These cores remain independent of UI state so browser surfaces and Node tests share the same protocol logic.

## Stable core and feature layers

`app.js` owns startup rendering, meeting collection, validation, save/edit flow, draft auto-save, saved-record search, basic import/export, printing, and direct downloads.

Later feature layers add decisions, templates, directories, attachment references, numbering, archive detail, revisions, recovery, accessibility, governance, signatures, retention, redaction, approval, recipient policies, receipts, disposition, signing, verification, custody, and recovery hardening.

A later layer may remove external content or bind more metadata, but it must never restore sensitive content removed by an earlier redaction layer or bypass an earlier control.

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

Provider synchronization does not replace or satisfy any stage in this pipeline.

## Data safety invariants

- Unknown record fields survive migration and provider round trips.
- Active and archived copies with the same record ID are not allowed.
- Revision history survives archive, restore, backup, and provider export.
- Active preservation holds block permanent disposition.
- Typed signatures and verification data remain excluded from external copies.
- Private signing keys remain absent from browser storage, provider state, exports, logs, backups, fixtures, and service-worker caches.
- Service workers cache application assets only.
- Provider health does not prove authentication, authorization, durability, identity, or delivery.

## Hosted-provider responsibility boundary

Passing the client conformance suite does not establish production readiness. A real hosted provider must independently implement and prove:

- authentication and authorization;
- tenant and organization isolation;
- encryption in transit and at rest;
- credential lifecycle and secret handling;
- server-side validation and rate limiting;
- durable audit and trusted timestamps;
- retention, preservation, approval, and disposition enforcement;
- backups and disaster recovery;
- data residency and deletion guarantees;
- observability without sensitive-data leakage;
- incident response.

See `V1.6.3-PROVIDER-CONTRACT.md` and `V1.6.3-ARCHITECTURE.md`.

## Validation

GitHub Actions runs:

1. syntax and required-file checks;
2. app-shell and service-worker wiring checks;
3. cryptographic, recovery, custody, and disposable-fixture Node tests;
4. a dedicated hosted-provider conformance job for memory and localStorage reference providers;
5. isolated Playwright browser suites across Chromium, Firefox, and WebKit where applicable.

Provider conformance is independent from the browser matrix, making provider failures distinguishable from rendering or browser-engine regressions. Test-only dependencies do not enter the deployed application.
