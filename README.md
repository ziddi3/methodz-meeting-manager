# Methodz Meeting Manager

Offline-first meeting records for Canadian Soft Water Corporation, Method HVAC Inc., and future partner workflows connected through the Methodz brand ecosystem.

> Methodz is treated in this app as a shared brand identity and operating ecosystem, not as a separate company.

## Current Version

**Version:** 0.6.0 numbering, duplicate review, and sync-readiness build

The app is intentionally static: HTML, CSS, vanilla JavaScript, and browser `localStorage`. It can run by opening `meeting.html` directly in a browser.

## Main Files

```text
meeting.html
style.css
features-v04.css
features-v05.css
features-v06.css
config.js
app.js
features-v03.js
features-v03-startup.js
features-v04-templates.js
features-v04-records.js
features-v05-attachments.js
features-v05-directory.js
features-v05-startup.js
features-v06-settings.js
features-v06-governance.js
PROJECT.md
CHANGELOG.md
docs/
```

## What It Does

- Creates offline meeting records
- Tracks meeting title, date, status, location, and facilitator
- Uses **Organizations / Representatives Present** wording
- Keeps Methodz as a brand identity, not a company label
- Supports attendance sign-on with typed signatures
- Uses **Assigned To** for follow-up tasks
- Stores records locally in the browser
- Saves drafts automatically
- Opens and edits saved records
- Exports TXT, JSON, HTML, CSV, and all-record JSON backups
- Prints / saves PDF through the browser print dialog

## Current Feature Layers

### v0.3 workflow layer

- Structured Decision Log
- Record Readiness Review
- Task filters
- Meeting Minutes Preview
- HTML meeting minutes export

### v0.4 template and archive layer

- Meeting templates
- Browser-local custom templates
- Custom agenda items
- Safer import preview
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
- Browser-local custom organization presets
- Duplicate Record Review
- Duplicate report export
- Local Sync Readiness
- Local sync queue metadata
- Sync package JSON export

The v0.6 sync package is export-only. It does not send data anywhere yet.

## How to Use

1. Download or clone the repository.
2. Open `meeting.html` in a browser.
3. Apply a meeting template if helpful.
4. Adjust meeting numbering only if the next number needs to change.
5. Apply an organization preset if helpful.
6. Add attendees, decisions, tasks, summary, and attachment references.
7. Use Record Readiness Review before saving.
8. Save the record.
9. Export all records as JSON after important meetings.
10. Use Duplicate Record Review before importing or syncing record sets.

## Local Storage Warning

Saved records live in the browser and device where they were created. Clearing browser data can delete them.

Recommended habit: after important meetings, use **Export All JSON** and save the backup somewhere safe.

## Meeting Numbering

Default numbering remains simple:

```text
001
002
003
```

Optional settings can add a prefix, year, padding, and manual next sequence number. Numbering changes affect new records only.

## Organization Presets

Default presets live in `config.js`. Custom presets are saved locally in the browser and can be exported/imported as JSON.

## Duplicate Review

Duplicate Review scans saved records for likely duplicates using:

- same normalized title and date
- same date and attendee list

It is advisory only. It does not merge or delete records automatically.

## Local Sync Readiness

The sync package export includes:

- records
- duplicate review output
- sync queue
- numbering settings
- organization presets
- attendee directory
- custom templates

This creates a clean adapter boundary for future Firebase, Supabase, CRM, Drive, or Methodz API sync.

## Configuration

Edit `config.js` to change:

- app title and subtitle
- logo paths
- organizations
- organization presets
- meeting numbering defaults
- meeting statuses
- meeting templates
- attendance types
- task priorities and statuses
- attachment types
- agenda categories
- storage keys

## Development Rules

- Keep the base app offline-first.
- Keep it deployable as static files.
- Avoid frameworks until the core workflow is proven.
- Avoid the word **Owner** for task responsibility.
- Use **Assigned To**.
- Use **Organizations / Representatives Present**.
- Do not imply Methodz is a registered company.
- Keep records exportable before adding live cloud sync.

## Roadmap

### v0.7

- Dedicated archive detail route / page
- Stronger print layout for attachment and signature audit sections
- Cloud adapter interface implementation
- More detailed organization / representative management

### v1.0

- Full meeting archive view
- Role-aware records
- Improved signature controls
- Cloud-sync-ready data adapter
- Attachment storage adapter boundary

### v2.0

- Firebase or Supabase sync
- User accounts
- Permissions
- AI meeting summaries
- Calendar integration
- CRM integration
- Audio or video recording workflow
