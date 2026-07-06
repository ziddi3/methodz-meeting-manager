# Architecture

Methodz Meeting Manager is currently a static, offline-first application. The design goal is to keep the base workflow simple, inspectable, and deployable before adding cloud services.

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

### `config.js`

Owns editable business defaults:

- brand labels
- logo paths
- organizations
- agenda groups
- meeting statuses
- task priorities
- task statuses
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

This file patches a small number of global app functions after the core loads. That keeps v0.2 behavior inspectable while allowing v0.3 features to evolve without rewriting the stable core.

### `style.css`

Owns visual layout:

- responsive cards
- header and logo layout
- form controls
- saved record cards
- decision log cards
- validation states
- task filter controls
- meeting minutes preview
- print mode

## Data Storage

Records are stored in browser `localStorage` under the key from `config.js`:

```js
methodzMeetingRecords
```

Drafts are stored separately:

```js
methodzMeetingDraft
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
  "schemaVersion": "0.3.0",
  "meetingNumber": "001",
  "title": "Partnership Operations Meeting",
  "status": "Scheduled",
  "date": "2026-07-06",
  "location": "Office",
  "facilitator": "Name",
  "organizations": ["Canadian Soft Water Corporation"],
  "attendees": [],
  "agenda": [],
  "notes": "",
  "decisions": "",
  "decisionsList": [
    {
      "decision": "Use new meeting records workflow",
      "approvedBy": "Meeting group",
      "date": "2026-07-06",
      "status": "Approved",
      "notes": "Applies to partner meetings first."
    }
  ],
  "tasks": [],
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

The first adapter is localStorage. Later adapters can use Firebase, Supabase, a Methodz API, or CRM webhooks.

## Deployment

The current app can deploy as static files to:

- GitHub Pages
- Vercel
- Netlify
- Render static site
- any regular web host

No build command is required.
