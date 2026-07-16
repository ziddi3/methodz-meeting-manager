# Methodz Meeting Manager

Offline-first meeting records for Canadian Soft Water Corporation, Method HVAC Inc., and future partner workflows connected through the Methodz brand ecosystem.

> Methodz is a shared brand identity and operating ecosystem, not a separate company.

## Current release

**Version 1.6.0**

The application remains a static HTML, CSS, and JavaScript app with no runtime package dependencies and no build command. It works by opening `meeting.html` directly and can also be deployed to any ordinary static host.

Version 1.6 adds optional cryptographic signatures for exported JSON packages while preserving the v1.5 recipient-policy operations and release-receipt workflow:

- ECDSA P-256 signatures with SHA-256 through Web Crypto;
- explicit private and public JWK import and export;
- private keys kept in page memory only;
- browser-local public-key registry with Active and Revoked states;
- package and signature-metadata tamper detection;
- standalone `verify.html` entry point;
- signing and verification audit exports;
- private-material rejection and public-key registry sanitation;
- schema 1.6 migration and automated cryptographic coverage.

All earlier recipient-policy, stewardship, release-receipt, disposition, approval, retention, redaction, archive, revision, recovery, directory, task, template, consent, and offline features remain intact.

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
- Preserve active legal holds before disposition
- Require review before external download and permanent disposition
- Separate controlled source records from redacted external copies
- Apply recipient allow-lists only after redaction
- Keep private signing keys out of browser storage
- Treat local roles, approvals, recipient policies, key status, and audit logs as workflow metadata until backed by authenticated infrastructure
- Use **Assigned To**, never “Owner,” for task responsibility
- Use **Organizations / Representatives Present** for participating groups
- Describe Methodz as a brand and operating ecosystem

## Architecture

```text
Configuration
  config.js
  config-v11.js through config-v16.js

Schema and migration
  migrations.js
  migrations-v10.js through migrations-v16.js

Record providers
  data-adapter.js
  async-data-adapter.js

Attachment provider
  attachment-adapter.js

Cryptographic package boundary
  crypto-package-core.js

Core workspace
  app.js

Feature layers
  features-v03*.js through features-v16*.js

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

## v1.6 cryptographic package signatures

### Recommended release flow

```text
controlled source record
  -> redaction profile
  -> recipient field allow-list
  -> content fingerprint
  -> external release approval
  -> approved JSON package
  -> optional ECDSA signature
  -> independent verification
```

Signing is optional and package-level. It does not replace redaction, recipient policy, stewardship review, release approval, release receipts, retention, legal holds, or disposition controls.

### Private-key rule

The application never writes private JWK material to localStorage. A generated or imported private key exists only in current page memory.

Before refreshing or closing the page, explicitly download the private-key backup and protect it separately. Anyone who obtains that file can create signatures under the corresponding key ID.

The cryptographic core rejects packages containing private JWK material. Public-key imports are normalized before storage and export. Existing malformed public-key registry entries are sanitized or removed when the workspace loads.

### What verification proves

A valid result confirms that:

- the current JSON package matches the signed canonical package;
- displayed signature metadata has not changed;
- the signature was created by the private key corresponding to the included public key;
- the included public key matches the recorded key ID.

It does not independently prove:

- the legal identity or authority of the signer;
- recipient identity;
- package delivery;
- approval legitimacy;
- compliance with a particular electronic-signature law.

Confirm the public key ID through an independent trusted channel before relying on a signer label.

## v1.5 recipient-policy operations

Recipient-specific policies support:

- accountable steward and role;
- business purpose;
- risk tier;
- review cadence and next-review date;
- review history;
- operational status;
- recipient-specific destination IDs;
- field allow-lists applied after redaction;
- chained release receipts for approved external downloads.

Stable recipient destinations use:

```text
recipient:<policy-id>
```

Changing recipient governance changes the external package fingerprint and invalidates stale approvals.

## External-export approval

External download approval remains bound to:

- the selected source record or current form;
- a source-bound redacted-content fingerprint;
- the selected redaction profile;
- the destination policy;
- the recipient-specific destination when used;
- recipient governance version;
- approval status and expiration.

Changing source content, destination, recipient policy, governance, profile, or custom sections invalidates the approval.

## Permanent disposition approval

Permanent Archive Vault removal requires:

1. no active preservation hold;
2. a documented request and disposition basis;
3. review by an authorized role;
4. a reviewer different from the requester;
5. an approval fingerprint matching the current archived record;
6. the existing final confirmation.

Completed removal consumes the approval and records a preservation-chain event.

## Retention and preservation holds

Records may carry retention policy, review date, lifecycle status, notes, legal hold state, hold history, and updated timestamps.

Retention presets are internal workflow aids, not legal advice. Confirm applicable tax, employment, privacy, insurance, safety, litigation, and contractual requirements before disposition.

An active preservation hold always blocks permanent disposition.

## Partner-safe external copies

External sharing creates a new redacted package and never edits the controlled source record.

Profiles:

- **Partner Safe** keeps operational content while removing signatures, internal notes, contact details, protected governance notes, file locations, and internal provider metadata.
- **Public Summary** exports high-level metadata, organizations, completed agenda items, approved structured decisions, and the summary.
- **Custom External Copy** allows destination-policy-approved sections while always removing typed signatures and signature verification.

## Typed-signature consent

Meeting attendance may use typed signatures only after explicit consent. “Name Match” means normalized typed text matches the attendee name. It does not prove identity.

Typed signatures, consent records, and verification metadata are excluded from every external-copy profile.

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

`async-data-adapter.js` defines the Promise-based boundary for future Firebase, Supabase, CRM, Drive, or Methodz API providers. The default provider wraps browser storage and transmits nothing.

### Attachment adapter

The default attachment provider stores metadata references only. It does not store binary files and rejects base64 or `data:` payloads.

## Browser storage keys

Current governance and signing keys include:

```text
methodzMeetingRecords
methodzMeetingDraft
methodzMeetingTemplates
methodzMeetingDirectory
methodzOrganizationDirectory
methodzMeetingRevisions
methodzArchivedMeetingRecords
methodzPreRestoreBackup
methodzMigrationState
methodzWorkspaceMergeLog
methodzMeetingRoleContext
methodzMeetingReleaseState
methodzRedactionExportLog
methodzExternalExportApprovals
methodzExternalExportApprovalLog
methodzDispositionApprovals
methodzDispositionAuditLog
methodzPreservationEventChain
methodzRecipientExportPolicies
methodzRecipientPolicyAudit
methodzRecipientPolicyGovernance
methodzRecipientPolicyOperationsAudit
methodzRecipientReleaseReceipts
methodzSigningPublicKeys
methodzSigningAudit
```

The original prototype key `meetingRecords` is still migrated when needed.

## Local storage warning

Records, policies, approvals, public-key metadata, and audit events remain on the browser and device where they were created unless exported. Clearing browser data can remove them.

Recommended practice:

1. Export a Workspace Backup after important meetings.
2. Export before changing devices, browsers, or hosting origins.
3. Keep backups in a separate protected folder or Drive location.
4. Store private signing keys separately from signed packages.
5. Preserve controlled source records separately from external copies.
6. Export approval, disposition, preservation, recipient-policy, receipt, key-registry, and signing audits for important decisions.
7. Do not treat browser-local logs or revocation status as immutable organization-wide controls.

## Static deployment

No build step is required.

Supported targets include:

- GitHub Pages
- Cloudflare Pages
- Netlify
- Vercel static hosting
- Render static hosting
- any ordinary web server
- localhost
- direct `file:` use for core meeting workflows

Service workers and Web Crypto are normally available on HTTPS or localhost. Direct-file mode remains supported for meeting records, but cryptographic availability may vary by browser context.

## Automated validation

GitHub Actions performs:

1. JavaScript syntax checks;
2. required static-file checks;
3. v1.6 module-wiring checks;
4. manifest JSON validation;
5. a Node Web Crypto signing, verification, tampering, and private-material self-test;
6. Playwright browser smoke tests.

Playwright is installed only in CI and adds no deployed runtime dependency.

## Documentation

```text
docs/ARCHITECTURE.md
docs/MANUAL-TEST-CHECKLIST.md
docs/SECURITY-AND-PRIVACY.md
docs/RELEASE-CHECKLIST.md
docs/V1.1-NOTES.md through docs/V1.6-NOTES.md
docs/V1.6-ARCHITECTURE.md
docs/V1.6-TESTS.md
```

## Roadmap

### 1.x hardening

- complete browser and device regression testing;
- strengthen key lifecycle documentation and recovery drills;
- consolidate older feature layers without breaking direct-file compatibility;
- improve accessible keyboard and screen-reader testing;
- add signed release-bundle examples without storing real private keys.

### 2.0

- Firebase or Supabase provider;
- authenticated user accounts and server permissions;
- organization-managed keys and durable revocation;
- server-enforced recipient policies, legal holds, retention, export approval, and disposition approval;
- append-only remote audit storage;
- calendar integration;
- CRM integration;
- AI-assisted summaries with explicit review;
- audio or video recording workflows with consent controls.
