# Methodz Meeting Manager

Offline-first meeting records for Canadian Soft Water Corporation, Method HVAC Inc., and future partner workflows connected through the Methodz brand ecosystem.

> Methodz is treated in this app as a shared brand identity and operating ecosystem, not as a separate company.

## Current Version

**Version:** 0.7.0 archive, adapter, and organization directory build

The app remains intentionally static: HTML, CSS, vanilla JavaScript, and browser storage. It can run by opening `meeting.html` directly, or it can be deployed to any static host without a build command.

## Entry Points

```text
meeting.html   Main meeting workspace
archive.html   Dedicated saved-record detail and print page
```

## Main Files

```text
meeting.html
archive.html
style.css
features-v04.css
features-v05.css
features-v06.css
features-v07.css
config.js
data-adapter.js
app.js
archive.js
features-v03.js
features-v03-startup.js
features-v04-templates.js
features-v04-records.js
features-v05-attachments.js
features-v05-directory.js
features-v05-startup.js
features-v06-settings.js
features-v06-governance.js
features-v07-organizations.js
features-v07-navigation.js
PROJECT.md
CHANGELOG.md
docs/
```

## Core Workflow

- Create and edit meeting records offline.
- Track title, date, status, location, facilitator, organizations, attendance, agenda, notes, decisions, tasks, attachments, and summary.
- Use typed attendance signatures and signature-audit metadata.
- Save drafts automatically.
- Store records in browser `localStorage`.
- Search, filter, open, edit, export, import, print, and delete records.
- Use **Assigned To** for task responsibility.
- Use **Organizations / Representatives Present** for participating groups.
- Keep Methodz identified as a brand and operating ecosystem.

## Feature Layers

### v0.3 workflow layer

- Structured Decision Log
- Record Readiness Review
- Task filters
- Meeting Minutes Preview
- HTML meeting-minutes export

### v0.4 template and archive layer

- Default and custom meeting templates
- Custom agenda items
- Import preview before merge
- Saved-record filters
- Open Task Dashboard
- Saved-record detail panel

### v0.5 attachment and directory layer

- Attachment References
- Attachment Index
- Attendee Directory
- Signature Controls
- Signature Audit

Attachment References store locations and notes only. They do not store private binary files in local storage.

### v0.6 governance layer

- Meeting Numbering Settings
- Organization Presets
- Duplicate Record Review
- Duplicate report export
- Local Sync Readiness
- Local sync queue metadata
- Sync package JSON export

The v0.6 sync package is export-only. It does not send data anywhere.

### v0.7 archive and adapter layer

- Dedicated `archive.html` record detail page
- Saved-record **Archive Page** action
- Current unsaved meeting archive preview
- Edit handoff from archive page back to `meeting.html`
- Print-focused attachment, attendance, signature-audit, task, and record-audit sections
- `data-adapter.js` record-storage contract
- Local storage adapter with health checks and export envelopes
- Organization / Representative Directory
- Organization details stored as record snapshots
- Organization directory JSON export/import
- Select an organization and optionally add its primary representative to attendance

## Using the App

1. Download or clone the repository.
2. Open `meeting.html`.
3. Apply a meeting template or organization preset when helpful.
4. Add meeting details, attendees, decisions, tasks, attachments, and summary.
5. Run Record Readiness Review.
6. Save the record.
7. Open **Archive Page** from the saved record for a dedicated detail and print view.
8. Export records or a sync package after important meetings.

## Dedicated Archive Page

`archive.html` reads a saved record through the active data adapter.

From a saved record card:

1. Choose **Archive Page**.
2. Review the complete meeting record.
3. Print or save PDF.
4. Download the record as JSON.
5. Choose **Edit Record** to return to the main workspace with that record open.

The main quick-action area also provides **Open Archive Preview** for the current unsaved meeting. Preview mode does not create a saved record.

## Data Adapter Contract

`data-adapter.js` defines the storage boundary used by v0.7.

The active adapter provides:

```text
listRecords()
getRecord(recordId)
replaceRecords(records)
upsertRecord(record)
deleteRecord(recordId)
createExportEnvelope(extra)
healthCheck()
```

The default provider is `LocalStorageMeetingAdapter`.

Future Firebase, Supabase, CRM, Drive, or Methodz API providers can implement the same contract and register through:

```js
window.MethodzMeetingData.registerAdapter(adapter);
window.MethodzMeetingData.useAdapter(adapter.id);
```

No cloud provider is enabled by default.

## Organization / Representative Directory

Custom directory entries can include:

- organization or representative-group name
- type
- primary representative
- contact detail
- notes

Directory entries are stored locally under `methodzOrganizationDirectory`.

When a directory entry is selected for a meeting, a snapshot is saved in the meeting record as `organizationDetails`. This preserves the meeting-time context even if the directory entry changes later.

The directory intentionally remains separate from the Attendee Directory:

- Organization Directory stores organization context.
- Attendee Directory stores reusable individual attendance details.
- Typed signatures are never saved as directory presets.

## Local Storage Warning

Saved records and directories live in the browser and device where they were created. Clearing browser data can delete them.

Recommended backup habits:

- Use **Export All JSON** after important meetings.
- Export the Organization Directory after major directory updates.
- Export a Sync Package or Adapter Snapshot before device changes.

## Configuration

Edit `config.js` to change:

- app title and subtitle
- logo paths
- default organizations
- organization types
- organization presets
- meeting-numbering defaults
- meeting statuses
- meeting templates
- attendance types
- task priorities and statuses
- attachment types
- agenda categories
- storage keys

## Static Deployment

No build step is required.

Deploy the repository directory to:

- GitHub Pages
- Cloudflare Pages
- Netlify
- Vercel static hosting
- any ordinary web server
- a local static server

Keep `meeting.html`, `archive.html`, JavaScript, CSS, and asset paths together.

## Development Rules

- Keep the base app offline-first.
- Keep it deployable as static files.
- Avoid frameworks until the core workflow is proven.
- Avoid the word **Owner** for task responsibility.
- Use **Assigned To**.
- Use **Organizations / Representatives Present**.
- Do not imply Methodz is a registered company.
- Keep records exportable before adding live cloud sync.
- Preserve old record fields during schema upgrades.
- Treat destructive actions as confirmation-required.

## Roadmap

### v0.8

- Record revision history
- Non-destructive archive / restore workflow
- Workspace-level backup and restore package
- Expanded adapter contract tests
- Better accessibility and keyboard navigation

### v1.0

- Full archive workspace
- Role-aware records
- Improved signature controls
- Cloud-sync-ready provider implementation
- Attachment storage adapter boundary
- Stable schema migration layer

### v2.0

- Firebase or Supabase sync
- User accounts
- Permissions
- AI meeting summaries
- Calendar integration
- CRM integration
- Audio or video recording workflow
