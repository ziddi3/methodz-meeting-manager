# Architecture

Methodz Meeting Manager is a static, offline-first application. The design goal is to keep the workflow inspectable and directly deployable while creating clean boundaries for revision history, archive lifecycle, workspace recovery, and future cloud providers.

## Entry Points

```text
meeting.html   Meeting creation, editing, dashboards, settings, history, archive vault, backup, and exports
archive.html   Dedicated record detail, archive review, and print surface
```

No server, package manager, or build command is required.

## Runtime Model

```text
meeting.html
  ├─ config.js
  ├─ data-adapter.js
  ├─ app.js
  ├─ features-v03.js
  ├─ features-v03-startup.js
  ├─ features-v04-templates.js
  ├─ features-v04-records.js
  ├─ features-v05-attachments.js
  ├─ features-v05-directory.js
  ├─ features-v05-startup.js
  ├─ features-v06-settings.js
  ├─ features-v06-governance.js
  ├─ features-v07-organizations.js
  ├─ features-v07-navigation.js
  ├─ features-v08-history.js
  ├─ features-v08-workspace.js
  ├─ adapter-contract-tests.js
  └─ features-v08-accessibility.js

archive.html
  ├─ config.js
  ├─ data-adapter.js
  └─ archive.js
```

Feature modules extend the stable core through browser globals and DOM injection. This keeps the project dependency-free while allowing incremental releases.

The v0.8 accessibility module loads last so it can improve the final wrapped versions of dynamic form builders and status actions.

## Core Responsibilities

### `config.js`

Owns editable defaults:

- brand labels and logo paths
- organizations and organization types
- organization presets
- agenda groups and meeting templates
- meeting, attendance, task, and attachment options
- numbering defaults
- revision retention limit
- storage keys

### `data-adapter.js`

Owns the synchronous record-storage interface.

Public manager:

```js
window.MethodzMeetingData
```

Default provider:

```js
LocalStorageMeetingAdapter
```

Required provider operations:

```text
listRecords()
getRecord(recordId)
replaceRecords(records)
upsertRecord(record)
deleteRecord(recordId)
healthCheck()
```

Optional provider operation:

```text
createExportEnvelope(extra)
```

Version 0.8 adds contract metadata and validation:

```js
window.MethodzMeetingData.requiredMethods
window.MethodzMeetingData.optionalMethods
window.MethodzMeetingData.validateAdapter(adapter)
```

The main app redirects global `getRecords()` and `setRecords()` through the active adapter.

### `app.js`

Owns the stable meeting core:

- startup rendering
- legacy storage migration
- meeting collection
- base validation
- save and edit flow
- draft auto-save
- saved-record search
- import and export
- print and download actions

### `archive.js`

Owns the dedicated read-only archive page:

- record resolution through the active adapter
- same-session fallback handling
- current unsaved preview
- complete record rendering
- print and JSON download
- edit handoff back to `meeting.html`

### `features-v08-history.js`

Owns:

- saved revision snapshots
- revision preview and restoration
- automatic current-state preservation before restore
- non-destructive archive lifecycle
- Archive Vault restore, download, and permanent delete

### `features-v08-workspace.js`

Owns:

- complete workspace package creation
- discovered/configured storage key collection
- package checksum
- restore validation and preview
- pre-restore recovery capture
- workspace replacement and reload

### `adapter-contract-tests.js`

Owns the isolated in-browser adapter test harness. It uses a temporary local-storage key and does not modify active meeting records.

### `features-v08-accessibility.js`

Owns:

- skip navigation
- main landmark focus target
- live status announcements
- generated label associations for dynamic fields
- keyboard shortcuts
- visible focus behavior
- reduced-motion-aware navigation

## Feature Layers

### v0.3

- structured decisions
- readiness review
- task filters
- minutes preview
- HTML export

### v0.4

- default and custom templates
- import preview
- saved-record filters
- open-task dashboard
- record details

### v0.5

- attachment references and index
- attendee directory
- signature helpers and audit

### v0.6

- numbering settings
- organization presets
- duplicate review
- sync queue and package export

### v0.7

- dedicated archive page
- data adapter contract
- organization / representative directory
- meeting-time organization snapshots
- stronger print layout

### v0.8

- revision history
- non-destructive Archive Vault
- complete workspace backup and restore
- adapter contract tests
- accessibility and keyboard navigation

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
```

The original prototype key `meetingRecords` is migrated when needed.

## Record Shape

The schema is additive. Optional feature layers preserve old records and add fields only when available.

```json
{
  "id": "meeting-1234567890",
  "schemaVersion": "0.8.0",
  "meetingNumber": "001",
  "title": "Partnership Operations Meeting",
  "status": "Scheduled",
  "date": "2026-07-10",
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
  "numbering": {},
  "syncMeta": null,
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp",
  "savedAt": "ISO timestamp"
}
```

## Revision Shape

Revision history is stored separately from active records.

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

The revision limit is configurable. Restoration keeps the active record ID and records both the pre-restore state and restored state.

## Archive Shape

```json
{
  "archiveId": "archive-...",
  "archivedAt": "ISO timestamp",
  "originalRecordId": "meeting-...",
  "record": {}
}
```

Archive lifecycle is deliberately separate from the business-facing `status` field.

## Workspace Package Shape

```json
{
  "packageType": "methodz-meeting-manager-workspace",
  "packageVersion": 1,
  "appName": "Methodz Meeting Manager",
  "schemaVersion": "0.8.0",
  "exportedAt": "ISO timestamp",
  "entries": {
    "methodzMeetingRecords": "raw JSON string"
  },
  "summary": {},
  "checksum": "fnv1a-..."
}
```

Raw local-storage strings are preserved to avoid accidental module-specific schema rewrites during backup.

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

## Organization Snapshot Rule

The Organization / Representative Directory is mutable local reference data.

When an entry is selected for a meeting, relevant details are copied into `organizationDetails`. Old meeting records retain the original meeting context even if the directory changes later.

## Archive Navigation

Saved record detail page:

```text
record card
  → archive.html?id=<record-id>
  → active adapter
  → complete archive render
```

Unsaved preview:

```text
current form
  → collectMeetingData()
  → sessionStorage preview
  → archive.html?preview=current
```

Edit handoff:

```text
archive.html
  → sessionStorage record ID
  → meeting.html
  → loadRecordForEditing(recordId)
```

Archive Vault lifecycle:

```text
active records
  → non-destructive archive
  → archived record store
  → restore or permanent delete
```

## Adapter Test Isolation

The in-app test harness validates the active interface, then exercises a temporary `LocalStorageMeetingAdapter` instance.

It tests:

- empty list
- create
- read
- update
- replace
- delete
- export envelope
- health check

The temporary key is removed in a `finally` block.

## Print Strategy

The archive page is the primary complete-record print surface.

Print mode:

- hides interactive controls
- keeps attendance and signature audit visible
- keeps task and attachment tables visible
- avoids page breaks inside logical cards where possible
- includes record audit metadata
- hides v0.8 workspace-management panels

## Future Cloud Path

A future provider can register through:

```js
window.MethodzMeetingData.registerAdapter(provider);
window.MethodzMeetingData.useAdapter(provider.id);
```

The current contract is synchronous because the existing offline core is synchronous. A future v1.0 provider layer should add asynchronous compatibility without forcing the form and archive renderer to know provider details.

Likely extraction targets:

```text
RevisionProvider
ArchiveProvider
WorkspacePackageService
SchemaMigrationRegistry
AsyncMeetingDataAdapter
AttachmentStorageAdapter
RolePolicyProvider
```

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
- Recovery snapshot before workspace replacement.
- Isolated tests before active-adapter mutation.

## Deployment

Static deployment targets include:

- GitHub Pages
- Cloudflare Pages
- Netlify
- Vercel
- Render static sites
- ordinary web servers
- local static servers

Keep both HTML entry points and all referenced JavaScript, CSS, and asset paths together.
