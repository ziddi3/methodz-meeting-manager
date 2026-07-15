# Methodz Meeting Manager

Offline-first meeting records for Canadian Soft Water Corporation, Method HVAC Inc., and future partner workflows connected through the Methodz brand ecosystem.

> Methodz is a shared brand identity and operating ecosystem, not a separate company.

## Current release

**Version 1.4.0**

The application remains a static HTML/CSS/JavaScript app with no runtime package dependencies and no build command. It works by opening `meeting.html` directly and can also be deployed to any ordinary static host.

Version 1.4 adds:

- named recipient-specific external-export policies;
- unique recipient destination IDs;
- per-recipient redaction-profile limits;
- per-recipient maximum field allow-lists;
- policy status and review dates;
- sensitive discussion-note safeguards;
- recipient-policy snapshots in export manifests and approval records;
- policy import/export and audit export;
- schema 1.4 migration and browser smoke coverage.

Version 1.3 disposition approvals, v1.2 external-export approvals, v1.1 retention and redaction, and all earlier archive, revision, recovery, directory, task, template, signature, and offline features remain intact.

## Entry points

```text
meeting.html   Main meeting workspace
archive.html   Dedicated detail and print view
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
- **Assigned To**, never “Owner,” for task responsibility
- **Organizations / Representatives Present** for participating groups
- Methodz described as a brand and operating ecosystem

## Architecture

```text
Configuration
  config.js
  config-v11.js
  config-v12.js
  config-v13.js
  config-v14.js

Schema and migration
  migrations.js
  migrations-v10.js
  migrations-v11.js
  migrations-v12.js
  migrations-v13.js
  migrations-v14.js

Record providers
  data-adapter.js
  async-data-adapter.js

Attachment provider
  attachment-adapter.js

Core workspace
  app.js

Feature layers
  features-v03*.js through features-v14*.js

Archive detail
  archive.js
  archive-v10.js
  archive-v11.js
  archive-v13.js

Static app shell
  manifest.webmanifest
  service-worker.js
```

Later feature layers intentionally wrap stable functions created by earlier layers. Script order in the HTML entry points is part of the application contract.

## v1.4 recipient-specific export policies

A recipient policy records:

```text
policy label
named recipient or accountable contact
organization
contact reference
base destination policy
allowed redaction profiles
maximum allowed field groups
status
review date
verification note
```

Every active policy becomes a runtime destination:

```text
recipient:<policy-id>
```

The export pipeline is:

```text
controlled source record
  -> redaction profile
  -> recipient field allow-list
  -> integrity calculation
  -> fingerprint-bound approval
  -> approved download
```

Recipient policies are subtractive. They can remove additional information but cannot restore anything removed by Partner Safe, Public Summary, or Custom External Copy.

An inactive or overdue policy cannot be applied, previewed, or used to request approval. Enabling discussion notes requires a meaningful verification note.

Because the approval fingerprint includes the unique destination-policy ID, an approval for one recipient policy cannot authorize a different recipient policy.

## v1.3 permanent disposition approval

Permanent Archive Vault removal requires:

1. no active preservation hold;
2. a documented disposition request and basis;
3. review by an authorized role;
4. a reviewer different from the requester;
5. an approval fingerprint matching the current archived record;
6. the existing final confirmation.

Default approval roles:

```text
Administrator
Auditor
```

Disposition states:

```text
Pending
Approved
Rejected
Revoked
Consumed
```

A completed removal consumes the approval. A changed archived record invalidates the approval and requires a new request.

The record fingerprint is a deterministic FNV-1a-32 local identity checksum. It detects local source changes but is not a digital signature, identity proof, or authenticated authorization.

## Preservation event chain

The local chain records:

- legal hold placed;
- legal hold released;
- disposition requested;
- disposition approved;
- disposition rejected;
- disposition revoked;
- approved archive removal completed.

Each event contains the previous digest and its own digest. The app can verify and export the sequence.

This is a browser-local tamper-evidence aid only. Anyone with access to local browser storage may alter or replace the data. A future hosted provider must use authenticated identities, server-side authorization, append-only storage, and durable approval consumption.

## External-export approval

External download approval is bound to:

- the selected source record or current meeting form;
- a source-bound redacted-content fingerprint;
- the selected redaction profile;
- the intended destination policy;
- the recipient-specific destination when used;
- approval status and expiration.

Changing source content, destination, recipient policy, profile, or custom sections invalidates the approval.

Previewing a redacted package is allowed before approval. JSON and HTML downloads require matching approval metadata.

## Retention and preservation holds

Each record can carry:

```text
retentionMetadata.policyId
retentionMetadata.reviewDate
retentionMetadata.lifecycleStatus
retentionMetadata.note
retentionMetadata.legalHold
retentionMetadata.holdHistory
retentionMetadata.updatedAt
```

Default retention presets:

```text
Operational Review - 2 Years
Business Record Review - 7 Years
Permanent / Do Not Dispose
Custom Review Date
```

These presets are internal workflow aids, not legal advice. Confirm applicable tax, employment, privacy, insurance, safety, litigation, and contractual requirements before disposition.

An active preservation hold always blocks permanent disposition, even when an older approval exists.

## Partner-safe external copies

External sharing creates a new redacted package and never edits the controlled source record.

Profiles:

- **Partner Safe** keeps operational content while removing signatures, internal notes, contact details, protected governance notes, file locations, and internal provider metadata.
- **Public Summary** exports high-level metadata, organizations, completed agenda items, approved structured decisions, and the summary.
- **Custom External Copy** allows destination-policy-approved sections while always removing signatures and signature verification.

Every package contains a redaction manifest with removed paths, warnings, an irreversible-redaction marker, and `signatureDataIncluded: false`.

Preferred package-integrity algorithm:

```text
SHA-256 through Web Crypto
```

Direct-file compatibility fallback:

```text
FNV-1a-32 compatibility checksum
```

A digest detects package changes. It is not a digital signature, identity proof, proof of recipient identity, or proof of approval.

## Electronic signature consent

A typed signature requires explicit consent before the record can be saved.

Recorded fields include consent state, statement version, method, timestamp, verification status, verifier, verification time, and verification note.

“Name Match” means only that normalized typed signature text matches the attendee name. It does not prove identity.

External copies never include typed signatures or their consent and verification metadata.

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

`async-data-adapter.js` defines the Promise-based boundary for future Firebase, Supabase, CRM, Drive, or Methodz API providers.

The default `local-storage-async` provider wraps the local adapter and transmits nothing.

### Attachment adapter

```text
listReferences(record)
getReference(record, referenceId)
upsertReference(record, reference)
deleteReference(record, referenceId)
validateReference(reference)
healthCheck()
```

The default provider stores metadata references only. It does not store binary files and rejects base64 or `data:` payloads.

## Browser storage keys

```text
methodzMeetingRecords
methodzMeetingDraft
methodzMeetingTemplates
methodzMeetingDirectory
methodzMeetingNumbering
methodzOrganizationPresets
methodzOrganizationDirectory
methodzSyncQueue
methodzSyncLastExport
methodzMeetingRevisions
methodzArchivedMeetingRecords
methodzPreRestoreBackup
methodzAccessibilityPreferences
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
```

The original prototype key `meetingRecords` is still migrated when needed.

## Local storage warning

Records, policies, approvals, and audit events live in the browser and device where they were created unless exported. Clearing browser data can remove them.

Recommended practice:

1. Export a Workspace Backup after important meetings.
2. Export before changing devices, browsers, or hosting origins.
3. Keep backups in a separate protected folder or Drive location.
4. Preserve pre-restore and pre-merge recovery packages until verified.
5. Preserve controlled source records separately from external copies.
6. Export approval, disposition, preservation, and recipient-policy audits for important decisions.
7. Do not treat browser-local logs as immutable compliance ledgers.

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
- direct `file:` use for the core app

Service workers and SHA-256 through Web Crypto are normally available on HTTPS or localhost. Direct-file mode keeps the meeting workflow and uses clearly labeled compatibility checksums where required.

## Automated validation

GitHub Actions performs:

1. JavaScript syntax checks;
2. required static-file checks;
3. v1.4 module-wiring checks;
4. manifest JSON validation;
5. Playwright browser smoke tests.

The v1.4 suite covers schema loading, recipient destination generation, field allow-list enforcement, approval binding, sensitive-note validation, and overdue-policy blocking. Earlier governance, redaction, retention, archive, revision, migration, and disposition suites remain active.

Playwright is installed only in CI.

## Documentation

```text
docs/ARCHITECTURE.md
docs/MANUAL-TEST-CHECKLIST.md
docs/SECURITY-AND-PRIVACY.md
docs/RELEASE-CHECKLIST.md
docs/V1.0-NOTES.md
docs/V1.1-NOTES.md
docs/V1.2-NOTES.md
docs/V1.3-NOTES.md
docs/V1.4-NOTES.md
docs/V1.4-ARCHITECTURE.md
docs/V1.4-TESTS.md
docs/V1.4-CHANGELOG.md
```

## Roadmap

### 1.x hardening

- complete browser and device regression testing;
- add optional public-key signatures only with explicit key management;
- move recipient, approval, and legal-hold enforcement to an authenticated provider;
- add append-only remote audit storage;
- add organization-managed recipient policy administration;
- consolidate older feature layers without breaking direct-file compatibility.

### 2.0

- Firebase or Supabase provider;
- authenticated user accounts and server permissions;
- server-enforced recipient policies, legal holds, retention, export approval, and disposition approval;
- calendar integration;
- CRM integration;
- AI-assisted summaries with explicit review;
- audio or video recording workflows with consent controls.
