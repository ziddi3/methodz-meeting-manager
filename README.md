# Methodz Meeting Manager

Offline-first meeting records for Canadian Soft Water Corporation, Method HVAC Inc., and future partner workflows connected through the Methodz brand ecosystem.

> Methodz is treated in this app as a shared brand identity and operating ecosystem, not as a separate company.

## Current Version

**Version:** 0.8.0 history, recovery, and accessibility build

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
features-v08.css
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
features-v08-history.js
features-v08-workspace.js
adapter-contract-tests.js
features-v08-accessibility.js
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
- Search, filter, open, edit, revise, archive, restore, export, import, print, and permanently delete records only after explicit confirmation.
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
- Organization details stored as meeting-time snapshots
- Organization directory JSON export/import

### v0.8 history, recovery, and accessibility layer

- Record revision history with up to 50 saved revisions per record by default
- Revision JSON preview and restoration
- Automatic current-state snapshot before restoring an older revision
- Non-destructive Archive Vault
- Restore, download, and permanently delete actions for archived records
- Complete workspace backup package
- Checksum validation and restore preview
- Automatic pre-restore recovery package
- Isolated data-adapter contract test harness
- Skip navigation, live status announcements, dynamic field labels, visible focus, reduced-motion support, and keyboard shortcuts

## Using the App

1. Download or clone the repository.
2. Open `meeting.html`.
3. Apply a meeting template or organization preset when helpful.
4. Add meeting details, attendees, decisions, tasks, attachments, and summary.
5. Run Record Readiness Review.
6. Save the record.
7. Open **Revision History** after later edits when an earlier state must be reviewed or restored.
8. Open **Archive Page** for a dedicated detail and print view.
9. Use **Archive** to remove a record from the active workspace without destroying it.
10. Export a Workspace Backup after important meetings or before changing devices or browsers.

## Revision History

Every successful save creates a full snapshot in browser-local revision storage.

A revision contains:

- revision number
- capture timestamp
- save or restore reason
- content hash
- complete record snapshot

Restoring a revision preserves the current record first, then restores the selected version and creates a new restore revision. Revision history is stored separately from active records under `methodzMeetingRevisions`.

Change the default retention limit in `config.js`:

```js
revisionLimit: 50
```

## Archive Vault

The saved-record **Archive** action is non-destructive.

Archived records move from the active record collection into `methodzArchivedMeetingRecords`. They can be:

- restored to the active workspace
- downloaded as JSON
- permanently deleted after explicit confirmation

The Archive Vault lifecycle is separate from the meeting `status` value named `Archived`.

## Workspace Backup and Restore

The Workspace Backup panel exports all recognized Methodz Meeting Manager browser data as one JSON package, including:

- active and archived records
- revision history
- current draft
- templates
- attendee and organization directories
- numbering and organization presets
- sync metadata
- future browser keys beginning with `methodz`

A restore package is validated and previewed before changes are applied. Immediately before restore, the app saves a complete local recovery package under `methodzPreRestoreBackup`.

Browser storage is device- and profile-specific. Workspace backup is the preferred transfer path between devices until live sync exists.

## Adapter Contract

`data-adapter.js` defines the synchronous record-storage boundary.

Required operations:

```text
listRecords()
getRecord(recordId)
replaceRecords(records)
upsertRecord(record)
deleteRecord(recordId)
healthCheck()
```

Optional operation:

```text
createExportEnvelope(extra)
```

The default provider is `LocalStorageMeetingAdapter`.

Future providers can register through:

```js
window.MethodzMeetingData.registerAdapter(adapter);
window.MethodzMeetingData.useAdapter(adapter.id);
```

Version 0.8 adds:

```js
window.MethodzMeetingData.validateAdapter(adapter);
window.MethodzMeetingData.requiredMethods;
window.MethodzMeetingData.optionalMethods;
```

The Adapter Contract Tests panel runs CRUD, export, and health checks against a temporary local-storage adapter. Active records are not modified.

## Dedicated Archive Page

`archive.html` reads a saved record through the active data adapter.

From a saved record card:

1. Choose **Archive Page**.
2. Review the complete meeting record.
3. Print or save PDF.
4. Download the record as JSON.
5. Choose **Edit Record** to return to the main workspace with that record open.

The main quick-action area also provides **Open Archive Preview** for the current unsaved meeting. Preview mode does not create a saved record.

## Keyboard Navigation

| Shortcut | Action |
|---|---|
| Ctrl / Command + S | Save current meeting |
| Ctrl / Command + Shift + N | Start a new meeting |
| Alt + R | Focus saved-record search |
| Alt + A | Jump to Archive Vault |
| Alt + H | Toggle keyboard shortcut guide |
| Escape | Close keyboard help or revision history |

A skip link appears when keyboard focus enters the page.

## Local Storage Warning

Saved records, archives, revisions, directories, settings, and drafts live in the browser and device where they were created. Clearing browser data can delete them.

Recommended backup habits:

- Export a Workspace Backup after important meetings.
- Export before clearing browser data or changing devices.
- Download the pre-restore recovery package after testing a restore.
- Keep important JSON packages in a separate backed-up folder or Drive location.

## Configuration

Edit `config.js` to change:

- app title and subtitle
- logo paths
- default organizations and organization types
- organization presets
- meeting-numbering defaults
- meeting statuses
- meeting templates
- attendance types
- task priorities and statuses
- attachment types
- agenda categories
- revision retention limit
- storage keys

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

The original prototype key `meetingRecords` is still migrated when needed.

## Static Deployment

No build step is required.

Deploy the repository directory to:

- GitHub Pages
- Cloudflare Pages
- Netlify
- Vercel static hosting
- Render static hosting
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
- Preserve current state before revision or workspace restores.
- Keep adapter tests isolated from active records.

## Documentation

```text
docs/ARCHITECTURE.md
docs/MANUAL-TEST-CHECKLIST.md
docs/V0.8-NOTES.md
docs/V0.8-ARCHITECTURE.md
docs/V0.8-TESTS.md
```

## Roadmap

### v0.9

- Stable schema migration registry
- Archive search, filters, and bulk export
- Revision comparison view
- Workspace package merge mode
- Improved automated browser tests
- Optional installable PWA shell while preserving direct-file compatibility

### v1.0

- Full archive workspace
- Role-aware records
- Improved signature controls
- Cloud-sync-ready asynchronous provider implementation
- Attachment storage adapter boundary
- Stable migration and validation pipeline

### v2.0

- Firebase or Supabase sync
- User accounts and permissions
- AI meeting summaries
- Calendar integration
- CRM integration
- Audio or video recording workflow
