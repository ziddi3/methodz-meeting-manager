# Architecture

Methodz Meeting Manager is a static, offline-first application. The design goal is to keep the base workflow simple, inspectable, and deployable before adding cloud services.

## Runtime Model

```text
meeting.html
  ↓ loads
config.js
  ↓ supplies settings to
app.js
  ↓ renders the offline core and stores records in
browser localStorage
  ↓ extended by
features-v03.js
  ↓ adds validation, minutes, task filters, and structured decisions
features-v04-templates.js + features-v04-records.js
  ↓ add templates, import preview, archive filters, details, and task dashboards
features-v05-attachments.js + features-v05-directory.js
  ↓ add attachment references, attendee directory, signature controls, and audit metadata
```

No server is required for the current version.

## Core Files

### `meeting.html`

Owns the application shell and major sections:

- header
- quick actions
- meeting information
- organizations / representatives present
- attendance
- agenda
- notes
- decisions
- tasks
- summary
- saved records

Feature modules inject additional panels around that shell instead of requiring a build system.

### `config.js`

Owns editable business defaults:

- brand labels
- logo paths
- organizations
- agenda groups
- meeting statuses
- meeting templates
- attendance types
- task priorities
- task statuses
- attachment types
- storage keys

This keeps business wording out of the core app logic.

### `app.js`

Owns the stable offline core:

- startup rendering
- local storage migration
- meeting collection
- base validation
- save / edit flow
- draft autosave
- saved record search
- record import / export
- print / download actions

### `features-v03.js`

Owns the v0.3 workflow layer:

- structured decision log
- record readiness review
- task filtering
- meeting minutes preview
- polished HTML export
- saved-record HTML export button injection
- TXT export extension for structured decisions and validation checks

### `features-v04-templates.js`

Owns template workflow:

- default meeting templates from `config.js`
- browser-local custom templates
- template export/import
- custom agenda items

### `features-v04-records.js`

Owns archive workflow:

- safer record import preview
- saved-record filters
- open-task dashboard
- open-task CSV export
- readable saved-record details panel

### `features-v05-attachments.js`

Owns attachment reference workflow:

- Attachment References panel on the current meeting
- attachment metadata collection into meeting records
- attachment section in TXT and HTML exports
- Attachment Index dashboard across saved records
- current attachment CSV export
- saved attachment index CSV export

Attachment References intentionally store pointers and notes, not binary files.

### `features-v05-directory.js`

Owns attendee preset and signature workflow:

- browser-local Attendee Directory
- directory JSON / CSV export
- directory JSON import
- add saved attendee preset to meeting
- fill unsigned signature fields from attendee names
- remove empty attendee rows
- signature audit metadata on meeting records
- signature audit section in TXT and HTML exports

Directory entries intentionally do not store signatures.

### Stylesheets

- `style.css` owns the base layout, forms, cards, buttons, saved records, and print mode.
- `features-v04.css` owns v0.4 panels.
- `features-v05.css` owns v0.5 attachment, directory, and signature panels.

## Data Storage

Records are stored in browser `localStorage` under the key from `config.js`:

```js
methodzMeetingRecords
```

Drafts are stored separately:

```js
methodzMeetingDraft
```

Custom templates are stored under:

```js
methodzMeetingTemplates
```

Attendee Directory presets are stored under:

```js
methodzMeetingDirectory
```

The app also migrates the original prototype key:

```js
meetingRecords
```

If old records exist and new records do not, old records are moved into the new key.

## Record Shape

```json
{
  "id": "meeting-1234567890",
  "schemaVersion": "0.5.0",
  "meetingNumber": "001",
  "title": "Partnership Operations Meeting",
  "status": "Scheduled",
  "date": "2026-07-08",
  "location": "Office",
  "facilitator": "Name",
  "organizations": ["Canadian Soft Water Corporation"],
  "attendees": [
    {
      "name": "Name",
      "organizationRole": "Canadian Soft Water Corporation",
      "attendanceType": "In Person",
      "signature": "Name",
      "signedAt": "ISO timestamp",
      "signatureStatus": "Signed",
      "signatureMethod": "Typed name"
    }
  ],
  "agenda": [],
  "notes": "",
  "decisions": "",
  "decisionsList": [
    {
      "decision": "Use new meeting records workflow",
      "approvedBy": "Meeting group",
      "date": "2026-07-08",
      "status": "Approved",
      "notes": "Applies to partner meetings first."
    }
  ],
  "tasks": [],
  "attachments": [
    {
      "id": "attachment-123",
      "label": "Install photo set",
      "type": "Photo",
      "location": "Drive / CSW / Installs / 2026-07-08",
      "date": "2026-07-08",
      "addedBy": "Name",
      "notes": "Shows finished setup."
    }
  ],
  "attachmentSummary": {
    "total": 1,
    "byType": {
      "Photo": 1
    }
  },
  "signatureAudit": {
    "totalAttendees": 1,
    "namedAttendees": 1,
    "signedAttendees": 1,
    "unsignedNamedAttendees": 0,
    "completed": true,
    "generatedAt": "ISO timestamp"
  },
  "directorySnapshot": [],
  "summary": "",
  "validation": [],
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp",
  "savedAt": "ISO timestamp"
}
```

## Design Principles

- Offline first.
- Export before sync.
- Configuration before hardcoding.
- Simple files before frameworks.
- Human-readable records.
- Beginner-editable code.
- Mobile-first usability.
- Modular growth before large rewrites.
- Store references before storing large files.
- Preserve signatures as meeting-specific facts, not reusable presets.

## Future Cloud Path

When the local workflow is proven, add a storage adapter instead of rewriting the UI.

Proposed adapter boundary:

```js
recordsRepository = {
  list(),
  save(record),
  delete(recordId),
  exportAll(),
  importMany(records)
}
```

Future attachment boundary:

```js
attachmentRepository = {
  listForRecord(recordId),
  saveReference(recordId, reference),
  uploadFile(recordId, file),
  resolveLocation(referenceId)
}
```

The first adapter is localStorage. Later adapters can use Firebase, Supabase, a Methodz API, CRM webhooks, or Drive-style storage.

## Deployment

The current app can deploy as static files to:

- GitHub Pages
- Vercel
- Netlify
- Render static site
- any regular web host

No build command is required.
