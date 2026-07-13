# Architecture

Methodz Meeting Manager is a static, offline-first application. The design keeps the workflow inspectable and directly deployable while creating replaceable boundaries for records, attachment references, migration, revision history, archive lifecycle, recovery, governance, retention, redaction, and future cloud providers.

## Entry Points

```text
meeting.html   Creation, editing, dashboards, settings, history, archive, recovery, retention, redaction, and exports
archive.html   Dedicated record detail, governance, consent, retention, audit, and print surface
```

No server, package manager, or build command is required.

## Runtime Model

```text
meeting.html
  ├─ config.js
  ├─ config-v11.js
  ├─ migrations.js
  ├─ migrations-v10.js
  ├─ migrations-v11.js
  ├─ data-adapter.js
  ├─ async-data-adapter.js
  ├─ attachment-adapter.js
  ├─ app.js
  ├─ features-v03*.js through features-v09*.js
  ├─ features-v10-governance.js
  ├─ features-v10-signatures.js
  ├─ features-v10-release.js
  ├─ features-v11-retention.js
  └─ features-v11-redaction.js

archive.html
  ├─ config.js
  ├─ config-v11.js
  ├─ migrations.js
  ├─ migrations-v10.js
  ├─ migrations-v11.js
  ├─ data-adapter.js
  ├─ attachment-adapter.js
  ├─ archive.js
  ├─ archive-v10.js
  └─ archive-v11.js
```

Feature modules extend the stable core through browser globals, function wrapping, and DOM injection. This keeps the deployed application dependency-free while allowing incremental releases.

Script order is intentional. Later layers wrap final versions installed by earlier layers.

`config-v11.js` loads before `migrations.js`, allowing the migration registry to capture schema `1.1.0` as the current version.

## Core Responsibilities

### Configuration

`config.js` owns stable editable defaults:

- brand labels and logo paths
- organizations and organization types
- agenda groups and templates
- meeting, attendance, task, and attachment options
- numbering defaults
- governance roles and policies
- signature-consent statement
- storage keys

`config-v11.js` extends the stable object with:

- schema and app-shell version `1.1.0`
- retention policy presets
- lifecycle statuses
- redaction profiles
- redaction export log key

### Migration

`migrations.js` owns the ordered migration registry and workspace migration across:

- active records
- archived records
- revision snapshots
- drafts
- the original `meetingRecords` key

`migrations-v10.js` adds governance, signature-consent, attachment-provider, and release-audit fields.

`migrations-v11.js` adds retention, legal-hold, and redaction metadata while extending validation.

Migration functions must remain ordered, idempotent, and additive. Unknown fields are preserved.

### Record Providers

`data-adapter.js` owns the synchronous record-storage interface.

Public manager:

```js
window.MethodzMeetingData
```

Required operations:

```text
listRecords()
getRecord(recordId)
replaceRecords(records)
upsertRecord(record)
deleteRecord(recordId)
healthCheck()
```

`async-data-adapter.js` defines Promise-returning equivalents for future Firebase, Supabase, CRM, Drive, or Methodz API providers.

The active providers remain local and transmit nothing.

### Attachment Provider

`attachment-adapter.js` owns metadata-only attachment references.

Required operations:

```text
listReferences(record)
getReference(record, referenceId)
upsertReference(record, reference)
deleteReference(record, referenceId)
validateReference(reference)
healthCheck()
```

Binary files are not stored by the default provider.

### Stable Core

`app.js` owns:

- startup rendering
- basic meeting collection and validation
- save and edit flow
- draft auto-save
- saved-record search
- basic import and export
- print and download actions

Later modules add fields and policy without replacing the direct-file core.

### Archive Detail

`archive.js` resolves and renders a complete record.

`archive-v10.js` appends governance, consent, and role-aware actions.

`archive-v11.js` appends retention and legal-hold status.

## Feature Layers

### v0.3 through v0.7

- structured decisions and readiness review
- templates and custom agenda
- attachment references and attendee directory
- numbering, organization presets, duplicate review, and sync package export
- dedicated archive page and organization directory
- synchronous data adapter

### v0.8

- revision history
- non-destructive Archive Vault
- complete workspace backup and restore
- adapter contract tests
- accessibility and keyboard navigation

### v0.9

- schema migration registry
- archive search, filtering, selection, and export
- revision comparison
- non-destructive workspace merge
- optional installable app shell
- Playwright smoke testing

### v1.0

- role-aware record governance
- explicit typed-signature consent
- signature verification metadata
- asynchronous record-provider contract
- attachment-reference provider contract
- consolidated active and archived workspace
- release validation

### v1.1

- retention policy and review-date metadata
- legal-hold placement, release, and history
- hold-protected archive disposition
- retention dashboard and report
- partner-safe, public-summary, and custom external copies
- redaction manifests and activity log
- SHA-256 package integrity with labeled compatibility fallback

## Current Record Shape

The schema is additive. Optional feature layers preserve old records and add fields only when available.

```json
{
  "id": "meeting-1234567890",
  "schemaVersion": "1.1.0",
  "meetingNumber": "001",
  "title": "Partnership Operations Meeting",
  "status": "Completed",
  "date": "2026-07-13",
  "location": "Office",
  "facilitator": "Name",
  "organizations": ["Canadian Soft Water Corporation"],
  "organizationDetails": [],
  "attendees": [],
  "agenda": [],
  "notes": "",
  "decisions": "",
  "decisionsList": [],
  "tasks": [],
  "attachments": [],
  "signatureAudit": {},
  "directorySnapshot": [],
  "summary": "",
  "validation": [],
  "governance": {},
  "accessControl": {},
  "retentionMetadata": {
    "policyId": "business-review-7y",
    "reviewDate": "2033-07-13",
    "lifecycleStatus": "Active",
    "note": "",
    "legalHold": {
      "active": false,
      "reason": "",
      "placedBy": "",
      "placedAt": "",
      "releasedBy": "",
      "releasedAt": "",
      "releaseNote": ""
    },
    "holdHistory": [],
    "updatedAt": "ISO timestamp"
  },
  "redactionMetadata": {},
  "attachmentAdapterMetadata": {},
  "schemaAudit": {},
  "releaseMetadata": {},
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp",
  "savedAt": "ISO timestamp"
}
```

## Revision and Archive Shapes

Revision history is stored separately:

```json
{
  "id": "revision-...",
  "recordId": "meeting-...",
  "revisionNumber": 1,
  "capturedAt": "ISO timestamp",
  "reason": "Record updated",
  "contentHash": "fnv1a-...",
  "snapshot": {}
}
```

Archived records use:

```json
{
  "archiveId": "archive-...",
  "archivedAt": "ISO timestamp",
  "originalRecordId": "meeting-...",
  "record": {}
}
```

Archive lifecycle is separate from the business-facing meeting `status`.

An active `record.retentionMetadata.legalHold.active` blocks Archive Vault permanent deletion.

## Workspace Recovery

Complete workspace backup preserves raw localStorage values for all discovered Methodz keys.

Restore sequence:

```text
parse
  → validate package type
  → validate recognized entries
  → validate checksum
  → preview
  → confirm
  → create pre-restore recovery
  → replace Methodz storage keys
  → reload
```

Workspace merge remains separate from replacement restore and creates its own recovery package.

## Governance and Consent

`accessControl` records classification, policy, allowed roles, prepared-by, reviewed-by, review status, protected fields, and policy note.

Role controls are workflow safeguards, not authentication.

Typed signatures require explicit consent. Verification metadata does not prove identity.

Remote providers must enforce authenticated permissions independently.

## Retention and Legal Hold

The retention module wraps the final meeting data flow to append `retentionMetadata`.

Hold transitions append chronological events:

```text
inactive → active   placed event
active → inactive   released event
```

The retention dashboard is read-only and indexes active and archived records.

Retention presets are workflow aids, not legal advice.

## External-Copy Pipeline

The v1.1 redaction pipeline is:

```text
resolve source
  → enforce export permission
  → clone source
  → apply allow-listed profile
  → recursively strip unsafe keys
  → append redaction manifest
  → compute package integrity
  → preview or download
  → record export activity metadata
```

The controlled source record is never modified.

Every profile removes typed signatures, signature consent, verification, and signer timestamps.

### Integrity

Hosted mode prefers SHA-256 through Web Crypto.

Direct-file environments without Web Crypto use an explicitly labeled FNV-1a-32 compatibility checksum.

Neither result is a digital signature or proof of identity.

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

The original prototype key `meetingRecords` is migrated when needed.

## Print Strategy

The archive page is the primary complete-record print surface.

Print mode:

- hides interactive controls
- keeps attendance, consent, decisions, tasks, attachments, governance, retention, and record audit visible
- displays an active hold warning
- avoids page breaks inside logical cards where possible
- hides operational dashboards and external-export controls

## Service Worker

The optional service worker caches static application assets only.

It does not intentionally cache:

- meeting records
- archived records
- revision history
- signatures
- attachment files
- redacted packages
- activity logs

## Testing

GitHub Actions runs:

- `node --check` for every JavaScript file
- static file and wiring checks
- manifest JSON validation
- Playwright browser smoke tests

The v1.1 suite covers retention persistence, active-hold archive protection, redaction safety, and integrity labeling.

## Future Provider Requirements

A future hosted provider must independently enforce:

- authentication
- authorization
- organization tenancy
- secure transport and storage
- legal holds and disposition
- retention policy
- immutable audit where required
- external-copy authorization
- server-side redaction policy

## Design Principles

- Offline first.
- Export before sync.
- Configuration before hardcoding.
- Simple files before frameworks.
- Human-readable records.
- Mobile-first and keyboard-usable interfaces.
- Additive schema changes.
- Meeting-specific signatures.
- Attachment references before binary storage.
- Historical snapshots for mutable directory data.
- Non-destructive archive before permanent deletion.
- Recovery snapshot before workspace replacement or merge.
- Legal hold before disposition.
- Allow-listed external copies before broad export.
- Accurate integrity labels without overstating trust.

## Deployment

Static deployment targets include:

- GitHub Pages
- Cloudflare Pages
- Netlify
- Vercel
- Render static sites
- ordinary web servers
- local static servers
- direct `file:` use

Keep both HTML entry points and all referenced JavaScript, CSS, and asset paths together.
