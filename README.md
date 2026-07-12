# Methodz Meeting Manager

Offline-first meeting records for Canadian Soft Water Corporation, Method HVAC Inc., and future partner workflows connected through the Methodz brand ecosystem.

> Methodz is treated in this app as a shared brand identity and operating ecosystem, not as a separate company.

## Current Version

**Version:** 0.9.0 migration, archive operations, workspace merge, browser automation, and optional PWA build

The application remains intentionally static: HTML, CSS, vanilla JavaScript, and browser storage. It can run by opening `meeting.html` directly, or it can be deployed to any static host without a build command.

Hosted deployments can optionally register the included service worker and install the app shell. Direct-file mode remains fully supported.

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
features-v09.css
config.js
migrations.js
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
features-v09-archive.js
features-v09-revisions.js
features-v09-workspace-merge.js
features-v09-pwa.js
manifest.webmanifest
service-worker.js
playwright.config.js
tests/browser-smoke.spec.js
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
- Search, filter, open, edit, revise, compare, archive, restore, export, import, print, and permanently delete records only after explicit confirmation.
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

- Attachment References and Attachment Index
- Attendee Directory
- Signature Controls and Signature Audit

Attachment References store locations and notes only. They do not store private binary files in local storage.

### v0.6 governance layer

- Meeting Numbering Settings
- Organization Presets
- Duplicate Record Review
- Local Sync Readiness and export-only sync packages

### v0.7 archive and adapter layer

- Dedicated `archive.html` record detail page
- Data-adapter contract and local storage provider
- Organization / Representative Directory
- Meeting-time organization detail snapshots
- Stronger print layout

### v0.8 history, recovery, and accessibility layer

- Record revision history
- Revision restore with automatic current-state preservation
- Non-destructive Archive Vault
- Complete workspace backup and replacement restore
- Adapter contract test harness
- Keyboard navigation, focus improvements, reduced motion, and live announcements

### v0.9 migration, archive operations, merge, and PWA layer

- Stable ordered schema migration registry
- Active, archived, revision, and draft migration
- Migration validation and run metadata
- Archive search and filters
- Archive selection and bulk JSON export
- Revision-to-revision and revision-to-current comparison
- Added, removed, and changed field-path reporting
- Non-destructive workspace package merge
- Prefer newest, keep local, and keep both conflict strategies
- Automatic pre-merge recovery package
- Optional web app manifest and service worker
- Direct-file-safe PWA controls
- Automated Playwright browser smoke tests in GitHub Actions

## Using the App

1. Download or clone the repository.
2. Open `meeting.html`, or serve the repository through a local/static web server.
3. Apply a meeting template or organization preset when helpful.
4. Add meeting details, attendees, decisions, tasks, attachments, and summary.
5. Run Record Readiness Review.
6. Save the record.
7. Use **Revision History** to review, compare, or restore older states.
8. Open **Archive Page** for a dedicated detail and print view.
9. Use **Archive** to remove a record from the active workspace without destroying it.
10. Export a Workspace Backup after important meetings or before changing devices or browsers.

## Schema Migration

`migrations.js` runs before the core workspace reads local data.

It migrates:

- active records
- archived record snapshots
- revision snapshots
- the current auto-saved draft

Public API:

```js
window.MethodzMigrations.migrateRecord(record)
window.MethodzMigrations.migrateWorkspace()
window.MethodzMigrations.validateRecord(record)
window.MethodzMigrations.getState()
```

Migrations are ordered, additive, unknown-field preserving, and safe to run repeatedly. The latest run summary is stored under `methodzMigrationState`.

## Archive Search and Bulk Export

The Archive Vault now supports:

- full-text search
- meeting-status filter
- organization / representative filter
- select filtered records
- export selected records as JSON
- export all filtered results as JSON

Filtering and exporting do not change archived records.

## Revision Comparison

Open **Revision History**, choose two versions, and select **Compare Versions**.

The comparison view reports:

- total differences
- added field paths
- removed field paths
- changed field paths
- left and right values

A complete comparison can be exported as JSON. Comparison is read-only and never creates or modifies a revision.

## Workspace Backup, Restore, and Merge

### Replacement restore

The v0.8 Workspace Backup panel can replace all recognized Methodz workspace data with a backup package. A pre-restore recovery package is saved first.

### Non-destructive merge

The v0.9 Workspace Package Merge panel adds incoming data while preserving local-only workspace entries.

Conflict strategies:

```text
Prefer the newest record
Keep local values
Keep both record versions
```

A pre-merge recovery package is saved under `methodzPreRestoreBackup`, and the completed merge is summarized under `methodzWorkspaceMergeLog`.

## Optional PWA Shell

When hosted over HTTPS or localhost:

- `manifest.webmanifest` describes the installable app
- `service-worker.js` caches the static app shell
- the PWA panel reports service-worker status
- installation is offered when supported by the browser
- offline cache refresh can be requested manually

When opened directly through `file:`:

- service-worker registration is skipped
- installation controls remain unavailable
- all core meeting, archive, revision, backup, import, export, and print features continue to work

The service worker caches static application files only. Meeting records remain in browser local storage.

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

## Keyboard Navigation

| Shortcut | Action |
|---|---|
| Ctrl / Command + S | Save current meeting |
| Ctrl / Command + Shift + N | Start a new meeting |
| Alt + R | Focus saved-record search |
| Alt + A | Jump to Archive Vault |
| Alt + H | Toggle keyboard shortcut guide |
| Escape | Close keyboard help or revision history |

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
```

The original prototype key `meetingRecords` is still migrated when needed.

## Local Storage Warning

Saved records, archives, revisions, directories, settings, drafts, migration state, and merge logs live in the browser and device where they were created. Clearing browser data can delete them.

Recommended backup habits:

- Export a Workspace Backup after important meetings.
- Export before clearing browser data or changing devices.
- Keep important JSON packages in a separate backed-up folder or Drive location.
- Preserve the pre-restore or pre-merge recovery package until the imported workspace has been verified.

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

Keep both HTML entry points, JavaScript, CSS, manifest, service worker, and asset paths together.

## Automated Validation

GitHub Actions runs:

1. JavaScript syntax checks
2. required static-file and wiring checks
3. manifest JSON validation
4. Playwright browser smoke tests against a temporary localhost server

Playwright is installed only in CI. The deployed application has no runtime package dependency.

## Development Rules

- Keep the base app offline-first.
- Keep it deployable as static files.
- Avoid runtime frameworks until the core workflow is proven.
- Avoid the word **Owner** for task responsibility.
- Use **Assigned To**.
- Use **Organizations / Representatives Present**.
- Do not imply Methodz is a registered company.
- Keep records exportable before adding live cloud sync.
- Preserve unknown and older record fields during schema upgrades.
- Treat destructive actions as confirmation-required.
- Preserve current state before revision, restore, or merge operations.
- Keep adapter and browser tests isolated from production records.

## Documentation

```text
docs/ARCHITECTURE.md
docs/MANUAL-TEST-CHECKLIST.md
docs/V0.9-NOTES.md
docs/V0.9-ARCHITECTURE.md
docs/V0.9-TESTS.md
```

## Roadmap

### v1.0

- Consolidated full archive workspace
- Role-aware records and policies
- Improved signature consent and verification controls
- Cloud-sync-ready asynchronous provider implementation
- Attachment storage adapter boundary
- Final schema validation and release hardening

### v2.0

- Firebase or Supabase sync
- User accounts and permissions
- AI meeting summaries
- Calendar integration
- CRM integration
- Audio or video recording workflow
