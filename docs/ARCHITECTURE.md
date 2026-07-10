# Architecture

Methodz Meeting Manager is a static, offline-first application. The design goal is to keep the workflow inspectable and deployable while creating clean boundaries for future cloud providers.

## Entry Points

```text
meeting.html   Meeting creation, editing, dashboards, settings, and exports
archive.html   Dedicated record detail, archive review, and print surface
```

No server or build command is required.

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
  └─ features-v07-navigation.js

archive.html
  ├─ config.js
  ├─ data-adapter.js
  └─ archive.js
```

Feature modules extend the stable core through browser globals and DOM injection. This keeps the project dependency-free while allowing incremental releases.

## Core Responsibilities

### `config.js`

Owns editable defaults:

- brand labels
- logo paths
- organizations and organization types
- organization presets
- agenda groups
- meeting templates
- meeting statuses
- attendance types
- task priorities and statuses
- attachment types
- numbering defaults
- storage keys

### `data-adapter.js`

Owns the record-storage interface.

Public manager:

```js
window.MethodzMeetingData
```

Default provider:

```js
LocalStorageMeetingAdapter
```

Required provider operations:

```js
listRecords()
getRecord(recordId)
replaceRecords(records)
upsertRecord(record)
deleteRecord(recordId)
healthCheck()
```

Optional provider operation:

```js
createExportEnvelope(extra)
```

The v0.7 main app redirects global `getRecords()` and `setRecords()` through this adapter.

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
- archive filters
- open-task dashboard
- record details

### v0.5

- attachment references
- attachment index
- attendee directory
- signature helpers
- signature audit

### v0.6

- numbering settings
- organization presets
- duplicate review
- sync queue
- sync package export

### v0.7

- dedicated archive page
- data adapter contract
- organization / representative directory
- meeting-time organization snapshots
- stronger print layout

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
```

The original prototype key `meetingRecords` is migrated when needed.

## Record Shape

The schema is additive. Optional feature layers preserve old records and add fields only when available.

```json
{
  "id": "meeting-1234567890",
  "schemaVersion": "0.7.0",
  "meetingNumber": "001",
  "title": "Partnership Operations Meeting",
  "status": "Scheduled",
  "date": "2026-07-10",
  "location": "Office",
  "facilitator": "Name",
  "organizations": ["Canadian Soft Water Corporation"],
  "organizationDetails": [
    {
      "id": "organization-123",
      "name": "Canadian Soft Water Corporation",
      "type": "Corporation",
      "primaryRepresentative": "Name",
      "contact": "Contact detail",
      "notes": "Meeting-time snapshot"
    }
  ],
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

## Organization Snapshot Rule

The Organization / Representative Directory is mutable local reference data.

When an entry is selected for a meeting, relevant details are copied into `organizationDetails`. Old meeting records therefore retain the original meeting context even if the directory changes later.

## Archive Navigation

Saved record:

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

## Print Strategy

The archive page is the primary complete-record print surface.

Print mode:

- hides interactive controls
- keeps attendance and signature audit visible
- keeps task and attachment tables visible
- avoids page breaks inside logical cards where possible
- includes record audit metadata

## Future Cloud Path

A future provider can register through:

```js
window.MethodzMeetingData.registerAdapter(provider);
window.MethodzMeetingData.useAdapter(provider.id);
```

The current contract is synchronous because the existing offline core is synchronous. A future v1.0 cloud provider layer should add asynchronous compatibility without forcing the form and archive renderer to know provider details.

## Design Principles

- Offline first.
- Export before sync.
- Configuration before hardcoding.
- Simple files before frameworks.
- Human-readable records.
- Mobile-first usability.
- Additive schema changes.
- Meeting-specific signatures.
- Attachment references before binary storage.
- Historical snapshots for mutable directory data.
- Confirm destructive actions.

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
