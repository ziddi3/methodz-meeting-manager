# Architecture

Methodz Meeting Manager is a static, offline-first meeting-record application. Its design keeps the workflow inspectable and directly deployable while defining replaceable boundaries for records, attachment references, migration, revision history, archive lifecycle, recovery, governance, retention, redaction, approval, disposition, recipient policy, policy operations, release receipts, cryptographic package signatures, and future hosted providers.

## Entry points

```text
meeting.html   Creation, editing, dashboards, governance, approvals,
               receipts, signing, verification, and exports
archive.html   Dedicated record detail, audit metadata, and print surface
verify.html    Standalone signed-package verification surface
```

No server, package manager, runtime dependency, or build command is required. Core meeting workflows must continue to work when `meeting.html` is opened directly.

## Runtime model

```text
meeting.html
  ├─ config.js
  ├─ config-v11.js through config-v16.js
  ├─ migrations.js
  ├─ migrations-v10.js through migrations-v16.js
  ├─ data-adapter.js
  ├─ async-data-adapter.js
  ├─ attachment-adapter.js
  ├─ crypto-package-core.js
  ├─ app.js
  ├─ features-v03*.js through features-v10*.js
  ├─ features-v11-retention.js
  ├─ features-v11-redaction.js
  ├─ features-v11-redaction-policy.js
  ├─ features-v12-export-approval.js
  ├─ features-v12-fingerprint-policy.js
  ├─ features-v12-release-audit.js
  ├─ features-v12-compatibility.js
  ├─ features-v13-disposition.js
  ├─ features-v14-recipient-policy.js
  ├─ features-v14-policy-hardening.js
  ├─ features-v15-policy-operations.js
  ├─ features-v15-download-routing.js
  ├─ features-v16-crypto.js
  └─ features-v16-record-metadata.js

archive.html
  ├─ config.js
  ├─ config-v11.js through config-v16.js
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

Configuration extensions load before the migration registry runs. This allows the registry to capture schema `1.6.0` as the active schema on the main and archive entry points.

## Configuration

`config.js` owns stable editable defaults including brand labels, logo paths, organizations, agenda groups, meeting options, numbering, base governance roles, consent text, and base storage keys.

Versioned extensions add release-specific settings:

```text
config-v11.js   retention presets, lifecycle states, redaction profiles
config-v12.js   external-export approval and destination policies
config-v13.js   disposition roles and preservation-event limits
config-v14.js   recipient-policy storage and field catalog
config-v15.js   policy review operations and release receipt limits
config-v16.js   cryptographic protocol, key registry, audit limits,
                and current schema/app-shell version
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

Migration functions must remain ordered, idempotent, additive, and safe to run repeatedly. They must not invent approvals, reviews, releases, preservation holds, disposition events, recipient policies, governance reviews, receipts, signatures, or key events.

## Provider boundaries

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

`crypto-package-core.js` is deliberately independent from meeting storage and UI state. Its public boundary provides:

```text
canonicalize(value)
unsignedPackage(packageValue)
containsPrivateKeyMaterial(value)
normalizePublicJwk(jwk)
publicJwkFromPrivate(jwk)
deriveKeyId(jwk)
generateKeyPair()
exportPrivateJwk(key)
exportPublicJwk(key)
importPrivateJwk(jwk)
importPublicJwk(jwk)
signPackage(packageValue, privateKey, metadata)
verifyPackage(packageValue)
```

This separation allows the main workspace, standalone verifier, Node self-test, and future hosted provider to share one package protocol implementation.

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

### v1.3 through v1.4

- disposition request, independent review, and approval consumption;
- preservation-event chain verification;
- named recipient-specific export policies;
- recipient destination IDs, profile limits, field allow-lists, review dates, and policy snapshots;
- stable recipient-policy fingerprinting and release metadata.

### v1.5

- recipient-policy stewardship and business-purpose records;
- policy risk tiers and review cadence;
- due-soon, overdue, current, undated, and inactive review queues;
- governance-version binding in redacted-content fingerprints;
- approved external release receipts;
- locally chained receipt verification and export;
- receipt references on active and archived source records;
- routing of every external-download control through the approved receipt-producing path.

### v1.6

- optional ECDSA P-256 / SHA-256 package signatures;
- canonical binding of package content and displayed signature metadata;
- explicit private and public JWK handling;
- memory-only private-key custody;
- public-key ID derivation and registry sanitation;
- browser-local Active and Revoked key workflow states;
- signing and verification audit exports;
- standalone verification without meeting-record import;
- saved-record signature metadata;
- Node Web Crypto and Playwright cryptographic regression coverage.

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

## Policy governance storage

Recipient policy governance is separate from the v1.4 policy object and joins by `policyId`:

```text
methodzRecipientPolicyGovernance
```

This preserves v1.4 normalization while allowing the operational layer to evolve. A completed review updates the v1.4 `reviewDate`, so existing inactive and overdue enforcement remains authoritative.

## Release receipt storage

```text
methodzExternalReleaseReceipts
```

Receipts contain source, approval, destination, recipient policy, optional governance, profile, format, package integrity, release timestamp, and chain metadata. Canonical JSON and FNV-1a-32 provide direct-file-compatible local change detection.

Receipt checksums are not digital signatures, identity authentication, proof of transmission, proof of delivery, or an immutable audit service.

## Cryptographic storage

```text
methodzSigningPublicKeys
methodzSigningAudit
```

Only public JWK material may enter the key registry. The signing audit is browser-local workflow history. Neither collection is an authenticated organization-wide authority.

Private JWK material remains in current page memory and is absent from browser storage, workspace backups, signed packages, public exports, verifier reports, and service-worker caches.

## Source record metadata

The latest release receipt updates:

```text
externalRecipientControl.lastReleaseReceiptId
externalRecipientControl.lastReleaseReceiptAt
externalRecipientControl.lastReleaseIntegrityAlgorithm
externalRecipientControl.lastReleaseIntegrityDigest
```

The latest successful package signing may update:

```text
externalSignatureControl.optional
externalSignatureControl.lastSignedPackageAt
externalSignatureControl.lastSigningKeyId
externalSignatureControl.lastSignatureAlgorithm
externalSignatureControl.lastVerificationAt
```

Both active and archived source records are supported when their IDs can be resolved.

## Data safety

- Workspace backup captures Methodz-prefixed browser-storage keys, including public-key and signing-audit collections.
- Private keys are deliberately absent from workspace backup.
- Unknown record fields survive migration.
- Active preservation holds block permanent disposition.
- Typed signatures and signature verification remain excluded from external copies.
- Policy, governance, approval, receipt, public-key, and audit records remain browser-local unless exported.
- Service workers cache application assets only, never meeting records or key material.

## Hosted-provider boundary

A future provider should replace local workflow assertions with authenticated identities, server-enforced permissions, organization-managed recipient policies, durable preservation holds, append-only approval and release logs, trusted timestamps, controlled key issuance and rotation, durable key revocation, independently distributed public keys, and hardware-backed or server-side signing where appropriate.

## Validation

GitHub Actions checks JavaScript syntax, required files, HTML and service-worker wiring, manifest JSON, a Node Web Crypto package self-test, and Playwright browser workflows. Playwright is CI-only and is not a deployed dependency.
