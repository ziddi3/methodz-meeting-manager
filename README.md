# Methodz Meeting Manager

Offline-first meeting records for Canadian Soft Water Corporation, Method HVAC Inc., and future partner workflows connected through the Methodz brand ecosystem.

> Methodz is treated as a shared brand identity and operating ecosystem, not as a separate company.

## Current Release

**Version 1.1.0**

The application remains a static HTML/CSS/JavaScript app with no runtime package dependencies and no build command. It works by opening `meeting.html` directly and can also be deployed to any ordinary static host.

Version 1.1 adds:

- record retention policies and review dates
- preservation / legal-hold tracking and history
- permanent-delete blocking for archived records on active hold
- a cross-record retention review dashboard
- partner-safe, public-summary, and custom external-copy profiles
- irreversible redaction manifests
- SHA-256 package integrity where Web Crypto is available
- explicitly labeled compatibility checksums when it is not
- browser-local external-export activity logging
- automated v1.1 browser smoke coverage

Version 1.0 capabilities remain intact, including governance policies, signature consent, provider contracts, archive history, migration, recovery, and consolidated records.

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
- **Assigned To**, never “Owner,” for task responsibility
- **Organizations / Representatives Present** for participating groups
- Methodz described as a brand and operating ecosystem

## Main Architecture

```text
Configuration
  config.js
  config-v11.js

Schema and migration
  migrations.js
  migrations-v10.js
  migrations-v11.js

Record providers
  data-adapter.js
  async-data-adapter.js

Attachment providers
  attachment-adapter.js

Core workspace
  app.js

Feature layers
  features-v03*.js through features-v11*.js

Archive detail
  archive.js
  archive-v10.js
  archive-v11.js

Static app shell
  manifest.webmanifest
  service-worker.js
```

Later feature layers intentionally wrap stable functions created by earlier layers. Script order in the HTML entry points is part of the application contract.

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

These presets are internal workflow aids, not legal advice. Confirm the applicable tax, employment, privacy, insurance, safety, litigation, and contractual requirements before disposition.

### Preservation Hold

A hold records:

- active state
- reason
- person placing the hold
- placement timestamp
- person releasing the hold
- release timestamp
- release note
- chronological hold history

An archived record with an active legal hold cannot be permanently deleted through the local Archive Vault interface.

This is a workflow safeguard. A future hosted provider must enforce hold rules on the server.

### Retention Dashboard

The dashboard indexes active and archived records and can filter:

- all records
- active legal holds
- review dates that are due
- missing review dates

The filtered index can be exported as JSON without modifying records.

## v1.1 Partner-Safe Export

External sharing creates a new redacted package. It never edits the controlled source record.

### Partner Safe

Keeps operational meeting content while removing signatures, internal discussion notes, contact details, protected governance notes, file locations, directory snapshots, and internal adapter or synchronization metadata.

### Public Summary

Exports only high-level meeting metadata, organizations, completed agenda items, approved or confirmed decisions, and the meeting summary.

### Custom External Copy

Allows section-level inclusion for:

- attendee names and roles
- agenda
- discussion notes
- decisions
- follow-up tasks
- attachment metadata
- limited retention summary

Typed signatures, consent records, and verification details are excluded from every profile.

### Redaction Manifest

Every package records:

- selected profile
- generation timestamp
- source meeting reference
- removed field paths
- warnings
- irreversible-redaction state
- `signatureDataIncluded: false`

### Integrity Digest

Preferred hosted algorithm:

```text
SHA-256 through Web Crypto
```

Direct-file compatibility fallback:

```text
FNV-1a-32 compatibility checksum
```

The package labels the algorithm and explains its boundary. A digest detects package changes. It is not a digital signature, identity proof, or proof of approval.

### Export Activity Log

Completed JSON and HTML downloads add a browser-local metadata entry containing the source reference, profile, time, format, and package digest. The log does not store a second copy of meeting content.

## v1.0 Record Governance

Each record can carry:

- classification
- policy ID
- allowed viewing roles
- prepared-by and reviewed-by names
- review status
- protected record areas
- policy note

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

These controls enforce workflow behavior in the local interface. They are not an authentication boundary. A future remote provider must enforce permissions on the server.

## Electronic Signature Consent

A typed signature requires explicit consent before the record can be saved.

Recorded fields include:

- consent accepted state
- consent statement version
- consent method
- consent timestamp
- verification status
- verifier
- verification timestamp
- verification note

“Name Match” means only that normalized typed signature text matches the attendee name. It does not prove identity.

Partner-safe exports never contain the typed signature or its consent and verification metadata.

## Consolidated Records Workspace

The searchable index covers:

- active records
- archived records
- classifications
- policies
- release-readiness results

The workspace can export the filtered index as JSON without changing records.

## Data Provider Contracts

### Synchronous contract

`data-adapter.js` remains the immediate local record boundary.

Required methods:

```text
listRecords()
getRecord(recordId)
replaceRecords(records)
upsertRecord(record)
deleteRecord(recordId)
healthCheck()
```

### Asynchronous contract

`async-data-adapter.js` defines the Promise-based boundary for future Firebase, Supabase, CRM, Drive, or Methodz API providers.

The default `local-storage-async` provider wraps the current local adapter and transmits nothing.

Register a future provider with:

```js
window.MethodzMeetingAsyncData.registerAdapter(adapter);
window.MethodzMeetingAsyncData.useAdapter(adapter.id);
```

A future provider must enforce authenticated access, hold protection, retention policy, and external-copy authorization independently.

## Attachment Provider Contract

`attachment-adapter.js` defines a replaceable reference-storage boundary.

The default provider stores metadata references inside meeting records. It does not store binary files and rejects base64 or `data:` payloads.

Required methods:

```text
listReferences(record)
getReference(record, referenceId)
upsertReference(record, reference)
deleteReference(record, referenceId)
validateReference(reference)
healthCheck()
```

Partner-safe exports remove attachment file locations and keep only allowed metadata.

## Release Validation

The release gate checks:

- record schema shape
- title and date
- governance fields
- signature consent
- declined or unverified signatures
- task assignment gaps
- attachment-reference safety and completeness
- retention metadata
- active hold reason
- retention review-date gaps

The audit can be exported as JSON.

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
```

The original prototype key `meetingRecords` is still migrated when needed.

## Local Storage Warning

Records live in the browser and device where they were created unless exported. Clearing browser data can remove them.

Recommended practice:

1. Export a Workspace Backup after important meetings.
2. Export before changing devices, browsers, or hosting origins.
3. Keep backups in a separate protected folder or Drive location.
4. Preserve pre-restore and pre-merge recovery packages until the workspace is verified.
5. Preserve controlled source records separately from partner-safe copies.
6. Do not treat the browser-local export log as an immutable compliance ledger.

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

Service workers and SHA-256 through Web Crypto are normally available on HTTPS or localhost. Direct-file mode keeps the meeting workflow and uses the clearly labeled compatibility checksum when required.

## Automated Validation

GitHub Actions performs:

1. JavaScript syntax checks
2. required static-file checks
3. v1.1 module-wiring checks
4. manifest JSON validation
5. Playwright browser smoke tests

The v1.1 browser suite covers:

- panel and migration registration
- retention save metadata
- legal-hold archive protection
- partner-safe removal of sensitive fields
- accurate integrity-algorithm labeling

Playwright is installed only in CI.

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
docs/SECURITY-AND-PRIVACY.md
docs/RELEASE-CHECKLIST.md
```

## Roadmap

### 1.x hardening

- complete browser and device regression testing
- add export approval and reviewer sign-off metadata
- add optional public-key package signatures only with explicit key management
- improve disposition approval and immutable legal-hold audit support
- refine partner field allow-lists for specific organizations
- consolidate older feature layers without breaking direct-file compatibility

### 2.0

- Firebase or Supabase provider
- authenticated user accounts and server permissions
- server-enforced legal holds and retention policies
- calendar integration
- CRM integration
- AI-assisted summaries with explicit review
- audio or video recording workflows with consent controls
