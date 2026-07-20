# Methodz Meeting Manager

Offline-first meeting records for Canadian Soft Water Corporation, Method HVAC Inc., and future partner workflows connected through the Methodz brand ecosystem.

> Methodz is a shared brand identity and operating ecosystem, not a separate company.

## Current release

**App shell 1.6.2 · Record schema 1.6.0**

The application is a static HTML, CSS, and JavaScript system with no runtime package dependencies and no build command. Open `meeting.html` directly or deploy the repository to an ordinary static host.

Version 1.6.2 adds documented public-key custody and lifecycle operations while preserving the v1.6 cryptographic package protocol and the v1.6.1 recovery controls:

- browser-local custody references for public verification keys;
- independently recorded public-key fingerprint checks;
- predecessor/successor key rotation with documented operator, reason, witness, and evidence reference;
- emergency public-key revocation;
- public custody manifests with canonical JSON and SHA-256 integrity;
- verified public-key manifest merge that never downgrades an existing local revocation;
- bounded custody audit export;
- portable Node and browser test coverage;
- memory-only private signing keys, unchanged from v1.6.0;
- shared backup inspection, recovery drills, and strict restore/merge validation from v1.6.1.

All earlier archive, revision, retention, preservation, redaction, export approval, recipient policy, disposition, signature-consent, directory, task, template, release-receipt, signing, verification, and offline features remain available.

## Entry points

```text
meeting.html   Main meeting workspace
archive.html   Dedicated detail and print view
verify.html    Standalone signed-package verifier
```

## Core principles

- Offline first
- Static and directly deployable
- No required server
- No runtime framework
- Exportable records before cloud sync
- Non-destructive archive and revision history
- Explicit confirmation before destructive actions
- Active preservation holds block permanent disposition
- External downloads require matching approval metadata
- Recipient allow-lists apply only after redaction
- Typed signatures require consent and remain excluded from external copies
- Private signing keys never enter browser storage
- Public-key lifecycle changes use the documented custody workflow
- A local Revoked key state is never downgraded by manifest import
- Workspace imports are validated immediately before mutation
- Recovery reports exclude meeting and workspace values
- **Assigned To**, never “Owner,” for task responsibility
- **Organizations / Representatives Present** for participating groups

## Architecture

```text
Configuration
  config.js
  config-v11.js through config-v16.js
  config-v162.js

Schema and migration
  migrations.js
  migrations-v10.js through migrations-v16.js

Record providers
  data-adapter.js
  async-data-adapter.js

Attachment provider
  attachment-adapter.js

Portable package boundaries
  crypto-package-core.js
  workspace-package-core.js
  key-custody-core.js

Core workspace
  app.js

Feature layers
  features-v03*.js through features-v16*.js
  features-v16-recovery.js
  features-v16-recovery-guards.js
  features-v162-key-custody.js
  features-v162-startup.js

Archive detail
  archive.js
  archive-v10.js
  archive-v11.js
  archive-v13.js

Standalone verification
  verify.html
  verify.js

Static app shell
  manifest.webmanifest
  service-worker.js
```

Later feature layers intentionally wrap stable functions created by earlier layers. Script order in the HTML entry points is part of the application contract.

## Public-key custody and rotation

The **Public-Key Custody & Rotation** panel appears after the cryptographic signing workspace.

### Custody metadata

For each registered public verification key, the app can record:

- custodian or controlled role;
- public-key custody reference;
- fingerprint verifier label;
- independent verification channel;
- fingerprint verification time;
- next review date;
- non-secret notes.

These values are browser-local operational metadata. The application cannot independently verify the human identity, role, or authority named in them.

### Fingerprint verification

A verification claim requires a verifier, an independent channel, and a timestamp. The actual key-ID comparison must occur through a separate trusted path such as an in-person comparison, voice call, trusted internal directory, or signed administrative record.

### Rotation workflow

```text
registered active predecessor
  -> generate or import active successor
  -> independently verify successor public-key ID
  -> record operator, reason, witness, and evidence reference
  -> complete rotation
  -> predecessor becomes Revoked
  -> successor remains Active
  -> predecessor and successor IDs are linked
  -> custody and signing audit events are appended
  -> export and distribute updated public custody manifest
```

The older one-click revoke/restore button is disabled. Revocation and rotation now require the documented v1.6.2 workflow. A revoked key is not silently restored.

### Public custody manifest

The exported package type is:

```text
methodz-public-key-custody-manifest
```

It includes public keys, lifecycle links, custody metadata, `privateKeysIncluded: false`, and a SHA-256 digest over canonical JSON.

Verification checks public JWK structure, derived key IDs, duplicate IDs, lifecycle metadata, private-key exclusion, and package integrity. A verified manifest may be merged into the browser registry only after confirmation. Existing local revocation is preserved even if an incoming manifest says the same key is Active.

See `docs/V1.6.2-KEY-CUSTODY.md` for scheduled rotation, emergency revocation, device migration, and trust-boundary procedures.

## Recovery readiness

The **Recovery Readiness** panel appears after the workspace backup and merge controls.

### Backup inspection

Selecting a workspace package performs a no-write inspection that:

- verifies package type and version;
- verifies the package checksum;
- checks entry count and byte limits;
- excludes unsupported and recursive recovery keys;
- scans parsed entries for private JWK material;
- compares declared summary counts with actual contents;
- calculates which local keys would be added, replaced, unchanged, ignored, or removed.

Inspection never writes or deletes browser data.

### Current-workspace drill

A drill packages the current workspace, validates it, and simulates restoring every recognized entry into an empty workspace. The app stores only compact drill metadata in:

```text
methodzRecoveryDrillLog
```

The default log cap is 100 events. It does not store meeting records or workspace values.

### Default import limits

```text
500 recognized storage entries
2 MiB per recognized entry
12 MiB total recognized workspace data
```

The v0.8 full-restore and v0.9 merge interfaces remain available. Version 1.6.1 wraps their apply functions and blocks mutation when the shared validation core rejects the selected package.

See `docs/V1.6.1-RECOVERY-HARDENING.md` for the threat model, drill procedure, and report format.

## Cryptographic package signatures

### Recommended release flow

```text
controlled source record
  -> redaction profile
  -> recipient field allow-list
  -> governance-version binding
  -> content fingerprint
  -> destination-bound approval
  -> approved JSON download and release receipt
  -> optional ECDSA package signature
  -> independent verification
```

Signing is optional and package-level. It does not replace redaction, recipient policy, stewardship review, release approval, release receipts, retention, preservation holds, or disposition controls.

### Private-key rule

Generated or imported private JWK material exists only in current page memory. Before refreshing or closing the page, explicitly download the private-key backup and protect it separately.

Private keys are prohibited from:

- browser storage;
- workspace backups;
- public-key registries;
- custody metadata;
- custody manifests;
- signed packages;
- audit exports;
- service-worker caches;
- committed automated fixtures.

### What verification proves

A valid package result confirms that:

- the current JSON package matches the signed canonical package;
- displayed signature metadata has not changed;
- the signature corresponds to the included public key;
- the included public key matches the recorded key ID.

It does not independently prove signer identity, authority, recipient identity, delivery, approval legitimacy, or legal compliance. Confirm public-key IDs through an independent trusted channel.

## External release controls

External release approval is bound to:

- the source record or current meeting form;
- the redacted-content fingerprint;
- the redaction profile;
- the destination policy;
- the recipient policy when selected;
- the governance version when available;
- approval status and expiration.

Every successful approved external download creates a receipt containing the approval snapshot, source reference, destination and policy snapshots, integrity value, release time, and receipt-chain digest.

Receipt chaining uses canonical JSON and FNV-1a-32 for direct-file compatibility. It provides local change detection, not identity proof, delivery proof, or an immutable remote ledger.

## Retention, preservation, and disposition

Records may carry retention policy, review date, lifecycle state, notes, legal-hold state, and hold history. Included presets are workflow aids, not legal advice.

Permanent Archive Vault removal requires:

1. no active preservation hold;
2. a documented disposition request and basis;
3. review by an authorized role;
4. a reviewer different from the requester;
5. a fingerprint matching the current archived record;
6. final deletion confirmation.

Browser-local requester, reviewer, steward, recipient, signer, custodian, operator, witness, and key labels are workflow metadata. They are not authenticated identities or legal signatures.

## Provider contracts

### Synchronous record adapter

```text
listRecords()
getRecord(recordId)
replaceRecords(records)
upsertRecord(record)
deleteRecord(recordId)
healthCheck()
```

### Asynchronous record adapter

`async-data-adapter.js` defines the Promise-based boundary for future Firebase, Supabase, CRM, Drive, or Methodz API providers. The default provider wraps local storage and transmits nothing.

### Attachment adapter

```text
listReferences(record)
getReference(record, referenceId)
upsertReference(record, reference)
deleteReference(record, referenceId)
validateReference(reference)
healthCheck()
```

The default attachment provider stores metadata references only. It rejects base64 and `data:` binary payloads.

## Browser storage and backup practice

Primary v1.x collections include meeting records, drafts, templates, directories, numbering, revisions, archive records, migration state, role context, redaction logs, approvals, disposition audits, preservation events, recipient policies, release receipts, public signing keys, signing audits, recovery drill metadata, public-key custody metadata, and custody audit events.

Workspace backup captures Methodz-prefixed browser-storage entries. Private signing keys are intentionally absent because they are never written to browser storage.

Recommended practice:

1. Export a Workspace Backup after important meetings.
2. Run a recovery drill after material workflow or browser changes.
3. Export before changing devices, browsers, or hosting origins.
4. Keep backups in a separate protected location.
5. Store private signing keys separately from signed packages and workspace backups.
6. Export the public custody manifest after key lifecycle changes.
7. Verify custody manifests on a separate browser or device before relying on them.
8. Preserve controlled source records separately from external copies.
9. Use a separate browser profile or device for full restore rehearsals.

Clearing browser data can remove records and local governance metadata.

## Static deployment

No build step is required. Supported targets include:

- direct `file:` use for the core meeting workflow;
- localhost;
- GitHub Pages;
- Cloudflare Pages;
- Netlify;
- Vercel static hosting;
- Render static hosting;
- any ordinary web server.

Service workers and Web Crypto are normally available on HTTPS or localhost. Direct-file mode keeps the core meeting and recovery workflows, although cryptographic availability may vary by browser context.

## Automated validation

GitHub Actions performs:

1. JavaScript syntax checks;
2. required static-file and app-shell wiring checks;
3. Node Web Crypto signing and tamper tests;
4. Node workspace-package validation and restore-plan tests;
5. Node public-key custody, manifest, rotation, and revocation tests;
6. manifest JSON validation;
7. focused Playwright recovery and custody suites;
8. complete Playwright browser regression tests.

Playwright is installed only in CI and is not a deployed dependency. Pull-request browser failures publish a concise diagnostic while preserving full traces as workflow artifacts.

## Documentation

```text
docs/ARCHITECTURE.md
docs/MANUAL-TEST-CHECKLIST.md
docs/SECURITY-AND-PRIVACY.md
docs/RELEASE-CHECKLIST.md
docs/V1.6-NOTES.md
docs/V1.6-ARCHITECTURE.md
docs/V1.6-TESTS.md
docs/V1.6-CHANGELOG.md
docs/V1.6.1-RECOVERY-HARDENING.md
docs/V1.6.2-KEY-CUSTODY.md
```

Earlier version-specific documents remain in `docs/` for historical context.

## Roadmap

### 1.x hardening

- complete multi-browser and device regression testing;
- add disposable signed example bundles without committing real private keys;
- add hosted-provider conformance fixtures;
- consolidate older feature layers without breaking direct-file compatibility;
- rehearse cross-device recovery and public-key rotation procedures;
- define organization-managed public-key distribution and incident-response policy;
- evaluate hardware-backed or OS-managed private-key options without weakening static deployment.

### 2.0 hosted provider

- Firebase, Supabase, or Methodz API provider;
- authenticated user accounts and server-enforced permissions;
- organization-managed recipient policy and public-key administration;
- durable key revocation and rotation records;
- server-enforced retention, preservation, export approval, and disposition approval;
- append-only remote audit, release receipt, and recovery-drill storage;
- calendar and CRM integration;
- AI-assisted summaries with explicit human review;
- audio or video recording workflows with consent controls.
