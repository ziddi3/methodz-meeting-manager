# Methodz Meeting Manager

Offline-first meeting records for Canadian Soft Water Corporation, Method HVAC Inc., and future partner workflows connected through the Methodz brand ecosystem.

> Methodz is treated as a shared brand identity and operating ecosystem, not as a separate company.

## Current Release

**Version 1.2.0**

The application remains a static HTML/CSS/JavaScript app with no runtime package dependencies and no build command. It works by opening `meeting.html` directly and can also be deployed to any ordinary static host.

Version 1.2 adds:

- destination-aware external-export approval requests
- requester and reviewer sign-off metadata
- approval, rejection, revocation, and expiry states
- source-bound redacted-content fingerprints
- approved JSON and HTML release packages
- browser-local approval and release audit export
- schema-safe archive-page migration loading
- stronger layered-feature compatibility checks
- expanded Playwright coverage for JSON and HTML release workflows

Earlier capabilities remain intact, including retention policies, preservation holds, partner-safe redaction, governance policies, signature consent, provider contracts, archive history, revision comparison, workspace recovery, migration, merge, and consolidated records.

## Entry Points

```text
meeting.html   Main meeting workspace
archive.html   Dedicated detail and print view
```

## Core Principles

- Offline first
- Static and directly deployable
- No required server
- No runtime framework
- Exportable records before cloud sync
- Non-destructive archive and revision history
- Explicit confirmation before destructive actions
- Separate controlled source records from redacted external copies
- Preserve active legal holds before disposition
- Require matching approval metadata before controlled external release
- **Assigned To**, never “Owner,” for task responsibility
- **Organizations / Representatives Present** for participating groups
- Methodz described as a brand and operating ecosystem

## Main Architecture

```text
Configuration
  config.js
  config-v11.js
  config-v12.js

Schema and migration
  migrations.js
  migrations-v10.js
  migrations-v11.js
  migrations-v12.js

Record providers
  data-adapter.js
  async-data-adapter.js

Attachment providers
  attachment-adapter.js

Core workspace
  app.js

Feature layers
  features-v03*.js through features-v12*.js

Archive detail
  archive.js
  archive-v10.js
  archive-v11.js

Static app shell
  manifest.webmanifest
  service-worker.js
```

Later feature layers intentionally wrap stable functions created by earlier layers. Script order in both HTML entry points is part of the application contract.

## v1.2 External Export Approval

External release begins with the existing v1.1 redaction preview and adds a separate approval workflow. The controlled source meeting record is not replaced by the approved package.

### Approval request

Each request records:

```text
approval ID
status
source selector and source reference
destination policy
redaction profile
custom included sections
requester
request timestamp
release purpose
expiry timestamp
redacted-content fingerprint
```

### Review lifecycle

A request can be:

```text
Pending
Approved
Rejected
Revoked
```

Approval also records the reviewer, review time, review note, and later download history.

Typed requester and reviewer names are browser-local workflow metadata. They do not authenticate identity, create an immutable ledger, or replace a legally qualified electronic signature.

### Destination policies

Default destination policies are:

```text
Canadian Soft Water Corporation
Method HVAC Inc.
Public / Website
Other External Recipient
```

Public / Website accepts only the Public Summary profile.

The two named internal-partner policies accept Partner Safe and a conservative Custom External Copy allow-list. Discussion notes remain blocked from those custom partner copies by default.

Other External Recipient accepts Partner Safe or Public Summary by default and blocks custom profiles.

These policies are configurable workflow presets, not legal conclusions about what a recipient may receive.

### Source-bound content fingerprint

Approval is bound to:

- the selected source record
- destination policy
- redaction profile
- exact redacted record content

Volatile preview timestamps are excluded so repeated previews of unchanged content produce the same fingerprint. A content, source, destination, or profile change invalidates the match and requires a new approval.

SHA-256 through Web Crypto is preferred. Direct-file mode keeps the existing explicitly labeled compatibility checksum when Web Crypto is unavailable.

### Approved packages

Approved JSON and HTML packages include:

- approval ID
- intended destination
- requester and reviewer
- request and approval timestamps
- expiry
- purpose and review note
- content fingerprint
- recalculated package integrity

Typed signatures, signature consent, and signature-verification details remain excluded.

### Approval audit

The browser-local audit export includes request, approval, rejection, revocation, and approved-download events.

It is a workflow history file, not an immutable or authenticated compliance ledger. A hosted provider must enforce identity, permissions, separation of duties, legal holds, destination rules, and audit durability on the server.

## v1.1 Record Retention

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

Default policy presets:

```text
Operational Review - 2 Years
Business Record Review - 7 Years
Permanent / Do Not Dispose
Custom Review Date
```

These presets are internal workflow aids, not legal advice. Confirm applicable tax, employment, privacy, insurance, safety, litigation, and contractual requirements before disposition.

An archived record with an active preservation hold cannot be permanently deleted through the local Archive Vault interface.

The Retention Review Dashboard indexes active and archived records and filters legal holds, due reviews, and missing review dates.

## v1.1 Partner-Safe Redaction

External sharing creates a separate redacted package and never edits the controlled source record.

### Partner Safe

Keeps operational content while removing signatures, discussion notes, contact details, protected governance notes, file locations, directory snapshots, and internal adapter or synchronization metadata.

### Public Summary

Exports high-level meeting metadata, organizations, completed agenda items, approved or confirmed structured decisions, and the meeting summary.

### Custom External Copy

Supports section-level inclusion for attendee names and roles, agenda, notes, decisions, tasks, attachment metadata, and a limited retention summary. Version 1.2 destination policies may further restrict these choices.

Every redaction package includes a manifest describing the profile, source meeting reference, removed paths, warnings, irreversible-redaction state, and `signatureDataIncluded: false`.

## v1.0 Governance and Signature Consent

Each record can carry classification, policy ID, allowed roles, prepared-by and reviewed-by names, review status, protected record areas, and policy notes.

Default roles:

```text
Administrator
Facilitator
Recorder
Participant
Auditor
Guest
```

Default policies:

```text
Standard Internal Record
Restricted Record
Read-Only Archive
Partner Shared Record
```

These local controls guide workflow behavior. They are not an authentication boundary.

A typed signature requires explicit consent before a record can be saved. Recorded metadata includes consent state, consent statement version, consent method, timestamps, verification status, verifier, and verification note.

“Name Match” means only that normalized typed signature text matches the attendee name. It does not prove identity.

## Records, Archive, and Recovery

The application includes:

- searchable active and archived record workspaces
- non-destructive Archive Vault
- permanent deletion only from the vault with confirmation
- saved revision snapshots
- revision-to-revision and revision-to-current comparison
- complete workspace backup and validated restore
- automatic pre-restore recovery package
- non-destructive workspace merge
- prefer-newest, keep-local, and keep-both conflict strategies
- duplicate review
- export-only sync-readiness packages

## Data Provider Contracts

### Synchronous record contract

`data-adapter.js` provides:

```text
listRecords()
getRecord(recordId)
replaceRecords(records)
upsertRecord(record)
deleteRecord(recordId)
healthCheck()
```

### Asynchronous record contract

`async-data-adapter.js` defines the Promise-based boundary for future Firebase, Supabase, CRM, Drive, or Methodz API providers.

The default `local-storage-async` provider wraps the local adapter and transmits nothing.

### Attachment reference contract

`attachment-adapter.js` stores metadata references inside meeting records. It does not store binary files and rejects base64 or `data:` payloads.

Required operations include list, get, upsert, delete, validate, and health check.

A future hosted provider must independently enforce authenticated access, external-release approval, legal holds, retention policy, and attachment authorization.

## Storage Keys

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
```

The original prototype key `meetingRecords` is still migrated when needed.

## Local Storage Warning

Records live in the browser and device where they were created unless exported. Clearing browser data can remove them.

Recommended practice:

1. Export a Workspace Backup after important meetings.
2. Export before changing devices, browsers, hosting origins, or service-worker versions.
3. Keep backups in a separate protected folder or Drive location.
4. Preserve pre-restore and pre-merge recovery packages until the workspace is verified.
5. Preserve controlled source records separately from redacted or approved external copies.
6. Do not treat browser-local activity or approval logs as immutable compliance ledgers.

## Static Deployment

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

Service workers and SHA-256 through Web Crypto are normally available on HTTPS or localhost. Direct-file mode keeps the complete meeting workflow and uses the clearly labeled compatibility checksum where required.

## Automated Validation

GitHub Actions performs:

1. JavaScript syntax checks
2. required static-file checks
3. v1.2 module-wiring checks on both HTML entry points
4. manifest validation
5. Playwright browser smoke tests

The browser suite covers:

- record save and legacy migration
- non-destructive archive
- revision comparison
- workspace merge helpers
- service-worker delivery
- governance and signature consent
- retention metadata and legal-hold protection
- redaction and integrity labeling
- destination-policy rejection
- stable and source-bound approval fingerprints
- JSON and HTML approved packages
- approval invalidation after content changes
- archive-page schema safety

Playwright is installed only in CI and is not a deployed runtime dependency.

## Documentation

```text
docs/ARCHITECTURE.md
docs/MANUAL-TEST-CHECKLIST.md
docs/V1.0-NOTES.md
docs/V1.0-ARCHITECTURE.md
docs/V1.0-TESTS.md
docs/V1.0-CHANGELOG.md
docs/V1.1-NOTES.md
docs/V1.1-ARCHITECTURE.md
docs/V1.1-TESTS.md
docs/V1.2-NOTES.md
docs/V1.2-ARCHITECTURE.md
docs/V1.2-TESTS.md
docs/SECURITY-AND-PRIVACY.md
docs/RELEASE-CHECKLIST.md
```

## Roadmap

### 1.x hardening

- add optional public-key package signatures only with explicit key management
- improve disposition approval and immutable legal-hold audit support
- refine partner field allow-lists for specific organizations
- add authenticated separation-of-duty rules when a remote provider exists
- consolidate older feature layers without breaking direct-file compatibility
- complete broader browser, device, accessibility, and print regression testing

### 2.0

- Firebase or Supabase provider
- authenticated user accounts and server permissions
- server-enforced legal holds, retention, and export approvals
- calendar integration
- CRM integration
- AI-assisted summaries with explicit human review
- audio or video recording workflows with consent controls
