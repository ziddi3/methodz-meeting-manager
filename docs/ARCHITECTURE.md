# Architecture

Methodz Meeting Manager is a static, offline-first meeting-record application. Its design keeps the workflow inspectable and directly deployable while defining replaceable boundaries for records, attachment references, migration, revision history, archive lifecycle, workspace recovery, governance, retention, redaction, approval, disposition, recipient policy, release receipts, cryptographic package signatures, public-key custody, and future hosted providers.

## Entry points

```text
meeting.html   Creation, editing, dashboards, governance, recovery,
               approvals, receipts, signing, key custody, and exports
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
  ├─ migrations.js
  ├─ migrations-v10.js through migrations-v16.js
  ├─ data-adapter.js
  ├─ async-data-adapter.js
  ├─ attachment-adapter.js
  ├─ crypto-package-core.js
  ├─ workspace-package-core.js
  ├─ key-custody-core.js
  ├─ app.js
  ├─ features-v03*.js through features-v15*.js
  ├─ features-v16-crypto.js
  ├─ features-v16-record-metadata.js
  ├─ features-v16-recovery.js
  ├─ features-v16-recovery-guards.js
  ├─ features-v162-key-custody.js
  └─ features-v162-startup.js

archive.html
  ├─ config.js
  ├─ config-v11.js through config-v16.js
  ├─ config-v162.js
  ├─ migrations.js
  ├─ migrations-v10.js through migrations-v16.js
  ├─ data-adapter.js
  ├─ attachment-adapter.js
  ├─ archive.js
  ├─ archive-v10.js
  ├─ archive-v11.js
  └─ archive-v13.js

verify.html
  ├─ crypto-package-core.js
  └─ verify.js
```

Feature modules extend the stable core through browser globals, function wrapping, and DOM injection. Script order is part of the application contract because later layers intentionally wrap functions installed by earlier layers.

Configuration extensions load before the migration registry. `config-v162.js` changes the app-shell version to `1.6.2` but deliberately leaves the active meeting-record schema at `1.6.0`.

## Configuration

`config.js` owns stable editable defaults including brand labels, logo paths, organizations, agenda groups, meeting options, numbering, base governance roles, consent text, and base storage keys.

Versioned extensions add release-specific settings:

```text
config-v11.js    retention presets, lifecycle states, redaction profiles
config-v12.js    external-export approval and destination policies
config-v13.js    disposition roles and preservation-event limits
config-v14.js    recipient-policy storage and field catalog
config-v15.js    policy review operations and release receipt limits
config-v16.js    cryptographic protocol, public-key registry, signing audit,
                 recovery settings, and schema 1.6.0
config-v162.js   key-custody storage, review cadence, verification channels,
                 and app-shell version 1.6.2
```

## Migration

`migrations.js` owns the ordered migration registry and workspace migration across active records, archived records, revision snapshots, drafts, and the original `meetingRecords` key.

```text
migrations-v10.js   governance, consent, provider, and release metadata
migrations-v11.js   retention, preservation hold, and redaction metadata
migrations-v12.js   external release-control metadata
migrations-v13.js   disposition-control and preservation-chain metadata
migrations-v14.js   external recipient-control metadata
migrations-v15.js   release receipt references and policy-operations metadata
migrations-v16.js   optional external signature-control metadata
```

Version 1.6.2 adds no meeting-record migration because it stores public-key custody outside meeting records. Migration functions must remain ordered, idempotent, additive, and safe to run repeatedly. They must not invent approvals, reviews, releases, holds, disposition events, recipient policies, receipts, signatures, key rotations, revocations, or custody verification claims.

## Provider and portable-core boundaries

### Synchronous records

```text
listRecords()
getRecord(recordId)
replaceRecords(records)
upsertRecord(record)
deleteRecord(recordId)
healthCheck()
```

### Asynchronous records

`async-data-adapter.js` defines Promise-returning equivalents for future Firebase, Supabase, CRM, Drive, or Methodz API providers. The default provider wraps local storage and transmits nothing.

### Attachment references

```text
listReferences(record)
getReference(record, referenceId)
upsertReference(record, reference)
deleteReference(record, referenceId)
validateReference(reference)
healthCheck()
```

The default attachment provider stores metadata references only and rejects inline binary payloads.

### Cryptographic package core

`crypto-package-core.js` is independent from meeting storage and UI state. It provides canonical JSON, private-key-material detection, P-256 public-key normalization, key-ID derivation, key import/export, package signing, and package verification.

This core is shared by the main workspace, standalone verifier, Node self-test, and future hosted provider.

### Workspace package core

`workspace-package-core.js` is independent from the visual recovery panel. It provides:

- workspace-package parsing and type validation;
- recognized-entry normalization;
- checksum verification;
- entry and package limits;
- summary consistency checks;
- recursive private-JWK detection;
- no-write replacement and merge planning;
- deterministic recovery-drill validation.

The browser inspection panel and the final restore/merge guards use the same core as the Node tests.

### Public-key custody core

`key-custody-core.js` is independent from local storage and DOM state. It provides:

```text
canonicalize(value)
containsPrivateKeyMaterial(value)
normalizePublicJwk(jwk)
deriveKeyId(jwk)
sanitizeRegistry(entries, maximumEntries)
createManifest(registry, custodyRecords, options)
verifyManifest(manifest, options)
buildRotationPlan(registry, options)
buildRevocationPlan(registry, options)
```

The core enforces public-only P-256 JWKs, derived key-ID consistency, unique key IDs, bounded registry size, required revocation timestamps, documented operator and reason fields, and SHA-256 custody-manifest integrity.

It returns plans instead of mutating browser storage. The UI layer obtains confirmation and applies plans to the browser-local registry.

## Stable core

`app.js` owns startup rendering, base meeting collection, validation, save/edit flow, draft auto-save, saved-record search, basic import/export, printing, and direct downloads. Later modules add fields and policy gates without removing direct-file compatibility.

## Feature layers

### v0.3 through v0.9

- structured decisions, readiness review, templates, and custom agenda;
- attachment references and reusable directories;
- numbering, duplicate review, and export-only sync packages;
- archive detail page and adapter boundary;
- revision history and non-destructive Archive Vault;
- workspace backup, restore, and merge recovery;
- accessibility and keyboard navigation;
- migration registry, archive filters, installable shell, and browser tests.

### v1.0 through v1.2

- record classification and role-aware workflow controls;
- explicit typed-signature consent and verification metadata;
- async record and attachment-provider contracts;
- retention and preservation holds;
- Partner Safe, Public Summary, and Custom External Copy profiles;
- source-bound external approval fingerprints;
- destination policies, approval expiry, revocation, and approved packages.

### v1.3 through v1.5

- disposition request, independent review, and approval consumption;
- preservation-event chain verification;
- named recipient-specific export policies;
- policy stewardship, risk tiers, business purpose, and review cadence;
- governance-version binding;
- approved external release receipts;
- local receipt-chain verification and export;
- routing of every external download through an approved receipt-producing path.

### v1.6.0

- optional ECDSA P-256 / SHA-256 package signatures;
- canonical binding of package content and displayed signature metadata;
- explicit private and public JWK handling;
- memory-only private-key custody;
- public-key ID derivation and registry sanitation;
- browser-local Active and Revoked key states;
- signing and verification audit exports;
- standalone signed-package verification;
- saved-record signature metadata.

### v1.6.1

- shared workspace-package validation core;
- no-write recovery inspection and replacement plans;
- metadata-only recovery readiness reports;
- current-workspace dry recovery drills;
- strict validation immediately before restore or merge;
- private-JWK rejection in parsed workspace entries;
- focused recovery Node and browser tests.

### v1.6.2

- public-key custody references and review dates;
- independently recorded public-key fingerprint checks;
- documented predecessor/successor rotation;
- emergency public-key revocation;
- bounded custody audit;
- public custody-manifest export and verification;
- verified public-key merge that preserves local revocations;
- disablement of the old one-click revoke/restore lifecycle control;
- portable Node and focused browser test coverage.

## External release and signing pipeline

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

A later layer may only remove content or bind additional metadata. It must never restore sensitive content removed by an earlier redaction layer. Signing does not bypass or replace any release control.

## Cryptographic and custody storage

```text
methodzSigningPublicKeys
methodzSigningAudit
methodzKeyCustodyMetadata
methodzKeyCustodyAudit
```

Only public JWK material may enter these collections.

`methodzSigningPublicKeys` contains public verification keys and browser-local lifecycle state. `methodzSigningAudit` contains browser-local signing and verification events. `methodzKeyCustodyMetadata` joins by derived key ID and stores non-secret custody references and fingerprint-check metadata. `methodzKeyCustodyAudit` contains browser-local custody, rotation, revocation, manifest, and merge events.

Private JWK material remains in current page memory and is absent from browser storage, workspace backups, public custody manifests, signed packages, public exports, verifier reports, tests, and service-worker caches.

## Rotation and manifest invariants

- A predecessor and successor must be different registered public keys.
- Both must be Active before a planned rotation.
- Rotation revokes the predecessor and records a reason and timestamp.
- Rotation links `replacedByKeyId` and `replacesKeyId`.
- Emergency revocation requires operator and reason.
- Revoked keys require a revocation timestamp.
- The UI does not expose silent reactivation.
- Custody-manifest verification fails on private material, key-ID mismatch, duplicate keys, malformed lifecycle data, or digest mismatch.
- A verified manifest merge never downgrades an existing local Revoked state.
- Browser-local lifecycle state is not organization-wide enforcement.

## Recovery invariants

- Inspection is no-write.
- Import limits apply during preview and immediately before mutation.
- Missing, malformed, skipped, or mismatched checksums do not report verified.
- Recursive private-key material blocks restore and merge.
- A valid recovery package is preserved before replacement or merge.
- Recovery reports contain metadata and key names, not meeting values.
- Dry drills write only bounded drill-result metadata.

## Policy and release storage

Recipient policy governance is separate from the v1.4 policy object and joins by `policyId`:

```text
methodzRecipientPolicyGovernance
```

Release receipts are stored in:

```text
methodzExternalReleaseReceipts
```

Receipts contain source, approval, destination, recipient policy, optional governance, profile, format, package integrity, release timestamp, and chain metadata. Canonical JSON and FNV-1a-32 provide direct-file-compatible local change detection, not digital signatures or delivery proof.

## Source-record metadata

The latest successful package signing may update:

```text
externalSignatureControl.optional
externalSignatureControl.lastSignedPackageAt
externalSignatureControl.lastSigningKeyId
externalSignatureControl.lastSignatureAlgorithm
externalSignatureControl.lastVerificationAt
```

The latest release receipt updates receipt pointers under `externalRecipientControl`. Both active and archived source records are supported when their IDs can be resolved.

Public-key custody metadata deliberately remains outside meeting records so rotation and custody changes do not rewrite historical meeting content.

## Data safety

- Workspace backup captures Methodz-prefixed browser-storage keys, including public-key and custody collections.
- Private keys are deliberately absent from workspace backup.
- Unknown record fields survive migration.
- Active preservation holds block permanent disposition.
- Typed signatures and verification remain excluded from external copies.
- Policy, approval, receipt, public-key, custody, and audit records remain browser-local unless exported.
- Service workers cache application assets only, never meeting records, workspace values, or key material.

## Hosted-provider boundary

A future provider should replace local workflow assertions with authenticated identities, server-enforced permissions, organization-managed recipient policy, durable preservation holds, append-only approval and release logs, trusted timestamps, controlled key issuance and rotation, organization-wide revocation distribution, independently distributed public keys, and hardware-backed or server-side signing where appropriate.

## Validation

GitHub Actions checks:

- JavaScript syntax;
- required static files and HTML/service-worker wiring;
- manifest JSON;
- Node Web Crypto signing and tamper tests;
- Node workspace-package recovery tests;
- Node public-key custody, manifest, rotation, and revocation tests;
- focused recovery and key-custody Playwright suites;
- complete browser regression coverage.

Playwright is CI-only and is not a deployed dependency. Pull-request browser failures publish a concise diagnostic and retain full trace artifacts.
