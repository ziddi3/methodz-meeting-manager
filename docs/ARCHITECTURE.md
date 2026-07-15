# Architecture

Methodz Meeting Manager is a static, offline-first meeting-record application. Its design keeps the workflow inspectable and directly deployable while defining replaceable boundaries for records, attachment references, migration, revision history, archive lifecycle, recovery, governance, retention, redaction, approval, disposition, recipient policy, and future hosted providers.

## Entry Points

```text
meeting.html   Creation, editing, dashboards, settings, history, recovery, governance, retention, redaction, approvals, recipient policies, and exports
archive.html   Dedicated record detail, governance, consent, retention, disposition audit, and print surface
```

No server, package manager, or build command is required. The core app must continue to work when `meeting.html` is opened directly.

## Runtime Model

```text
meeting.html
  ├─ config.js
  ├─ config-v11.js through config-v14.js
  ├─ migrations.js
  ├─ migrations-v10.js through migrations-v14.js
  ├─ data-adapter.js
  ├─ async-data-adapter.js
  ├─ attachment-adapter.js
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
  └─ features-v14-policy-hardening.js

archive.html
  ├─ config.js
  ├─ config-v11.js through config-v14.js
  ├─ migrations.js
  ├─ migrations-v10.js through migrations-v14.js
  ├─ data-adapter.js
  ├─ attachment-adapter.js
  ├─ archive.js
  ├─ archive-v10.js
  ├─ archive-v11.js
  └─ archive-v13.js
```

Feature modules extend the stable core through browser globals, function wrapping, and DOM injection. Script order is part of the application contract because later layers intentionally wrap the final functions installed by earlier layers.

Configuration extensions load before `migrations.js`. This allows the migration registry to capture schema `1.4.0` as the active schema.

## Configuration

`config.js` owns stable editable defaults:

- brand labels and logo paths;
- organizations and organization types;
- agenda groups and templates;
- meeting, attendance, task, and attachment options;
- numbering defaults;
- governance roles and policies;
- signature-consent statement;
- base storage keys.

Versioned configuration extensions add release-specific settings:

```text
config-v11.js   retention presets, lifecycle statuses, redaction profiles
config-v12.js   external-export approval and destination policies
config-v13.js   disposition approval roles and preservation-event limits
config-v14.js   recipient-policy storage and field-group catalog
```

## Migration

`migrations.js` owns the ordered migration registry and workspace migration across:

- active records;
- archived records;
- revision snapshots;
- drafts;
- the original `meetingRecords` key.

Version extensions add fields without deleting unknown data:

```text
migrations-v10.js   governance, consent, provider, and release metadata
migrations-v11.js   retention, preservation hold, and redaction metadata
migrations-v12.js   external release-control metadata
migrations-v13.js   disposition-control and preservation-chain metadata
migrations-v14.js   external recipient-control metadata
```

Migration functions must remain ordered, idempotent, additive, and safe to run repeatedly. They must not invent approval, hold, disposition, or recipient-policy audit events.

## Record Providers

`data-adapter.js` owns the synchronous meeting-record interface:

```text
listRecords()
getRecord(recordId)
replaceRecords(records)
upsertRecord(record)
deleteRecord(recordId)
healthCheck()
```

`async-data-adapter.js` defines Promise-returning equivalents for future Firebase, Supabase, CRM, Drive, or Methodz API providers.

The default providers remain browser-local and transmit nothing.

## Attachment Provider

`attachment-adapter.js` owns metadata-only attachment references:

```text
listReferences(record)
getReference(record, referenceId)
upsertReference(record, reference)
deleteReference(record, referenceId)
validateReference(reference)
healthCheck()
```

The default provider stores references only. It rejects inline `data:` and base64 payloads and does not store binary files.

## Stable Core

`app.js` owns:

- startup rendering;
- basic meeting collection and validation;
- save and edit flow;
- draft auto-save;
- saved-record search;
- basic import and export;
- print and download actions.

Later modules add fields and policies without replacing direct-file compatibility.

## Feature Layers

### v0.3 through v0.7

- structured decisions and readiness review;
- templates and custom agenda;
- attachment references and attendee directory;
- numbering, organization presets, duplicate review, and sync package export;
- dedicated archive page and organization directory;
- synchronous data adapter.

### v0.8 through v0.9

- revision history, preview, comparison, and restore;
- non-destructive Archive Vault;
- complete workspace backup, replacement restore, and merge recovery;
- accessibility and keyboard navigation;
- ordered migration registry;
- archive search and bulk export;
- optional installable app shell;
- Playwright browser smoke testing.

### v1.0

- record classification and role-aware governance;
- explicit typed-signature consent;
- signature verification metadata;
- asynchronous record-provider contract;
- attachment-reference provider contract;
- consolidated active/archive workspace;
- release validation.

### v1.1

- retention policy and review-date metadata;
- preservation-hold placement, release, and history;
- hold-protected archive disposition;
- Partner Safe, Public Summary, and Custom External Copy profiles;
- redaction manifests and activity log;
- SHA-256 package integrity with labeled compatibility fallback.

### v1.2

- external-export approval requests;
- separate requester and reviewer fields;
- destination-policy validation;
- source-bound redacted-content fingerprints;
- approval expiry, rejection, revocation, and release logging;
- approved JSON and HTML packages.

### v1.3

- archived-record disposition requests;
- authorized reviewer-role gates;
- requester/reviewer separation;
- archived-record fingerprint binding;
- approval consumption after permanent removal;
- preservation-event chain verification and export.

### v1.4

- named recipient-specific export policies;
- dynamic destination IDs in the form `recipient:<policy-id>`;
- per-recipient allowed redaction profiles;
- per-recipient maximum field groups;
- policy status and review date;
- sensitive discussion-note verification safeguard;
- recipient-policy snapshots in manifests and approvals;
- stable recipient-policy fingerprints.

## Current Record Shape

The schema is additive. Optional feature layers preserve older records and unknown fields.

```json
{
  "id": "meeting-1234567890",
  "schemaVersion": "1.4.0",
  "meetingNumber": "001",
  "title": "Partnership Operations Meeting",
  "status": "Completed",
  "date": "2026-07-15",
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
  "retentionMetadata": {},
  "redactionMetadata": {},
  "externalReleaseControl": {},
  "externalRecipientControl": {},
  "dispositionControl": {},
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

## Workspace Recovery

Complete workspace backup preserves raw localStorage values for all discovered Methodz keys.

Replacement restore sequence:

```text
parse
  -> validate package type
  -> validate recognized entries
  -> validate checksum
  -> preview
  -> confirm
  -> create pre-restore recovery
  -> replace Methodz storage keys
  -> reload
```

Workspace merge remains separate from replacement restore and creates its own recovery package.

## Governance and Signature Consent

`accessControl` records classification, policy, allowed roles, preparation, review, protected fields, and policy notes.

Role controls are workflow safeguards, not authentication.

Typed signatures require explicit consent. Name matching and verification metadata do not prove identity. External copies never include typed signatures, consent, or signature-verification data.

## Retention, Preservation Hold, and Disposition

The retention module appends `retentionMetadata` and chronological hold events.

```text
inactive -> active   hold placed event
active -> inactive   hold released event
```

An active hold blocks permanent archive disposition even when an older disposition approval exists.

Disposition approval requires an authorized reviewer, requester/reviewer separation when configured, a matching archived-record fingerprint, and final confirmation. Successful permanent removal consumes the approval and appends a preservation-chain event.

The local event chain is a tamper-evidence aid, not an immutable compliance ledger.

## External-Copy Pipeline

The complete v1.4 external-copy pipeline is:

```text
resolve controlled source
  -> enforce record export permission
  -> apply v1.1 redaction profile
  -> recursively strip unsafe keys
  -> apply v1.4 recipient field allow-list when selected
  -> append redaction and recipient-policy manifests
  -> compute package integrity
  -> compute v1.2 source-and-destination-bound approval fingerprint
  -> request and review approval
  -> verify approval still matches current content
  -> download approved JSON or HTML
  -> record release activity metadata
```

The controlled source record is never modified.

### Recipient Policy Boundary

Recipient policies run after redaction and are subtractive only. They cannot restore fields removed by Partner Safe, Public Summary, or Custom External Copy.

Each active recipient policy becomes a runtime destination:

```text
recipient:<policy-id>
```

The unique destination ID is included in approval fingerprints. Policy snapshots are included in the manifest and approval record. Inactive or overdue policies cannot be used.

### Integrity

Hosted mode prefers SHA-256 through Web Crypto. Direct-file environments without Web Crypto use an explicitly labeled FNV-1a-32 compatibility checksum.

Neither result is a digital signature, proof of identity, proof of approval, or proof of delivery.

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
methodzDispositionApprovals
methodzDispositionAuditLog
methodzPreservationEventChain
methodzRecipientExportPolicies
methodzRecipientPolicyAudit
```

The original prototype key `meetingRecords` is migrated when needed.

## Print Strategy

The archive page is the primary complete-record print surface.

Print mode:

- hides interactive controls;
- keeps attendance, consent, decisions, tasks, attachments, governance, retention, and audit data visible;
- displays active hold warnings;
- avoids page breaks inside logical cards where possible;
- hides operational dashboards and external-export controls.

## Service Worker

The optional service worker caches static application assets only. It does not intentionally cache meeting records, archive entries, revisions, signatures, attachment files, redacted packages, policies, approvals, or audit events.

## Testing

GitHub Actions runs:

- `node --check` for every JavaScript file;
- static file and script-wiring checks;
- manifest JSON validation;
- Playwright browser smoke tests.

The v1.4 tests cover recipient destination generation, field filtering, approval binding, sensitive-note validation, overdue-policy blocking, and stable repeated-preview fingerprints. Earlier release suites remain active.

## Future Provider Requirements

A future hosted provider must independently enforce:

- authentication and authorization;
- organization tenancy;
- secure transport and storage;
- recipient policy administration;
- server-side field allow-lists;
- approval expiry, revocation, and consumption;
- preservation holds and disposition;
- retention policy;
- append-only or immutable audit storage where required;
- server-side redaction policy;
- recipient verification and delivery logging.

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
- Preservation hold before disposition.
- Redaction before recipient allow-listing.
- Recipient-specific approval before external release.
- Accurate integrity labels without overstating trust.

## Deployment

Static deployment targets include GitHub Pages, Cloudflare Pages, Netlify, Vercel, Render static sites, ordinary web servers, localhost, and direct `file:` use.

Keep both HTML entry points and all referenced JavaScript, CSS, and asset paths together.
