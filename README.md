# Methodz Meeting Manager

One place for Methodz-aligned meetings, group discussions, decisions, attendance sign-off, evidence references, and follow-up tasks.

This repository contains an offline-first meeting manager for Canadian Soft Water Corporation, Method HVAC Inc., and future partner workflows connected through the Methodz brand ecosystem.

> Methodz is treated in this app as a shared brand identity and operating ecosystem, not as a separate company.

## Current Version

**Version:** 0.5.0 attachment and directory build

The application is intentionally simple: static HTML, CSS, and vanilla JavaScript. It can run by opening `meeting.html` directly in a browser.

## Files

```text
methodz-meeting-manager/
├── meeting.html                    Main application page
├── style.css                       Responsive interface and print styles
├── features-v04.css                Styles for v0.4 template, archive, and dashboard panels
├── features-v05.css                Styles for v0.5 attachments, attendee directory, and signature controls
├── app.js                          Offline app logic
├── config.js                       Organizations, agenda items, templates, labels, attachment types, and storage keys
├── features-v03.js                 Validation, minutes, task filters, and structured decisions
├── features-v03-startup.js         Startup helpers for v0.3 saved cards and decision drafts
├── features-v04-templates.js       Meeting templates and custom agenda items
├── features-v04-records.js         Import preview, archive filters, task dashboard, and saved details
├── features-v05-attachments.js     Attachment references and attachment index dashboard
├── features-v05-directory.js       Attendee directory, signature helpers, and signature audit data
├── PROJECT.md                      Product specification and build rules
├── README.md                       Setup and usage guide
└── .github/
    └── copilot-instructions.md     AI build rules for GitHub Copilot
```

## Features

- Offline-first meeting records
- Configurable organizations and agenda groups
- Configurable meeting templates
- Browser-local custom meeting templates
- Custom one-off agenda items
- Meeting status tracking
- Organizations / Representatives Present checklist
- Attendance sign-on with typed digital signatures
- Attendee Directory for repeat attendee presets
- Signature Controls for filling agreed typed signatures and removing blank attendee rows
- Signature Audit stored with meeting records
- Agenda checklist grouped by category
- Discussion notes
- Free-form decisions field
- Structured Decision Log with confirmed-by, date, status, and notes
- Follow-up tasks using **Assigned To** instead of **Owner**
- Task priority, target date, and progress fields
- Task filtering by text, progress, and priority
- Open Task Dashboard across saved meetings
- Attachment References for photos, quotes, invoices, drawings, CRM references, and evidence locations
- Attachment Index across saved meetings
- Meeting summary
- Record Readiness Review panel
- Auto-saved draft
- Saved meeting archive using browser `localStorage`
- Search saved meeting records
- Filter saved records by status and organization / representative
- Open / edit saved records
- Readable saved-record detail view
- Delete saved records with confirmation
- Meeting Minutes Preview
- Download current meeting as TXT
- Download current meeting as JSON
- Export current or saved meeting as polished HTML minutes
- Export open tasks as CSV
- Export current attachment references as CSV
- Export saved attachment index as CSV
- Export attendee directory as JSON or CSV
- Export all saved records as JSON
- Safer import preview before merging JSON records
- Import saved records from JSON after preview
- Import attendee directory presets from JSON
- Print / save PDF through the browser print dialog
- Mobile-friendly layout

## How to Use

### Option 1: Open directly

1. Download or clone the repository.
2. Open `meeting.html` in Chrome, Edge, Firefox, or Safari.
3. Apply a template if helpful.
4. Fill out the meeting information.
5. Add attendees manually or from the Attendee Directory.
6. Add attachment references for supporting files, evidence, or CRM links.
7. Use **Record Readiness Review** to check the record.
8. Click **Save Record**.

### Option 2: Use GitHub Pages later

This app is static, so it can be deployed to GitHub Pages, Vercel, Netlify, Render static sites, or any basic web host.

No build command is required.

## Local Storage Warning

Saved records live in the browser's local storage. That means:

- Records are stored on the specific device and browser used.
- Clearing browser data can delete records.
- Exporting all records as JSON is the backup strategy until cloud sync exists.
- Attachment References store locations and notes only. They do not store the actual files.
- Attendee Directory presets are local to the browser until exported.

Recommended habit: after important meetings, click **Export All JSON** and save the file somewhere safe.

## Templates

Default templates include:

- Operations Review
- Marketing & Branding Review
- CRM & Workflow Build

Templates can prefill meeting title, status, organizations, notes prompts, summary prompts, and starter tasks. The app can also save the current form as a local template and export/import those templates as JSON.

## Attendee Directory

Version 0.5 adds a browser-local Attendee Directory. It is meant for repeat participants and saves:

- name
- organization / role
- attendance type
- notes

Typed signatures are **not** saved into directory presets. Signatures stay meeting-specific.

## Attachment References

Version 0.5 adds Attachment References. These are structured pointers to external files or evidence, such as:

- install photos
- quotes
- invoices
- drawings
- logo files
- customer communication
- CRM references

The app stores a reference name, type, location, date, added-by, and notes. It does not store binary files in local storage.

## Data Export

Single meeting records can be downloaded as:

- `.txt` for readable meeting notes
- `.json` for structured backups or future sync
- `.html` for polished meeting minutes that can be opened, printed, or shared

Open tasks can be exported as `.csv` from the Open Task Dashboard.

Attachment references can be exported as `.csv` from the current meeting or from the saved-record Attachment Index.

The Attendee Directory can be exported as `.json` or `.csv`.

All records can be exported as one JSON file using **Export All JSON**.

## Data Import

Use **Choose Import JSON** to preview either:

- an array of meeting records, or
- an exported object containing a `records` array

The preview shows how many records are valid, new, updates, or skipped. Nothing is merged until **Merge Import** is clicked.

Existing records with the same `id` are updated. New records are added.

The Attendee Directory can also import a JSON file containing either an array or a `directory` array.

## Configuration

Edit `config.js` to change:

- app title and subtitle
- logo paths
- default organizations
- meeting statuses
- meeting templates
- attendance types
- task priorities
- task statuses
- attachment types
- agenda categories and checklist items
- storage keys

Keep `config.js` plain and dependency-free so the app remains portable.

## Version 0.5 Notes

Version 0.5 continues the modular enhancement pattern:

- `features-v05-attachments.js` owns attachment references and the saved-record attachment index.
- `features-v05-directory.js` owns the attendee directory, signature helpers, and signature audit data.
- `features-v05.css` owns v0.5 visual styling.

The core remains static, offline-first, and dependency-free.

## Development Rules

- Keep the base app offline-first.
- Keep it deployable as static files.
- Avoid frameworks until the core workflow is proven.
- Avoid the word **Owner** for task responsibility.
- Use **Assigned To**.
- Use **Organizations / Representatives Present**.
- Do not imply Methodz is a registered company.
- Keep records exportable before adding any cloud sync.
- Store attachment references, not large private files, until a proper storage adapter exists.

## Roadmap

### Version 0.6

- Meeting numbering settings
- Saved-record duplicate detection
- Dedicated archive detail route / page
- Cloud-sync adapter stub
- Organization presets
- Stronger print layout for attachment and signature audit sections

### Version 1.0

- Full meeting archive view
- Role-aware meeting records
- Improved signature controls
- Cloud-sync-ready data adapter
- Attachment storage adapter boundary

### Version 2.0

- Firebase or Supabase sync
- User accounts
- Permissions
- AI meeting summaries
- Calendar integration
- CRM integration
- Audio or video recording workflow

## Status

The app is now a working static prototype with real local saving, search, export, import preview, editing, structured decisions, task filtering, validation review, HTML meeting minutes export, reusable templates, custom agenda items, archive filters, an open-task dashboard, attendee directory, signature audit, attachment references, and attachment index exports.
