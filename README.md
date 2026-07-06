# Methodz Meeting Manager

One place for Methodz-aligned meetings, group discussions, decisions, attendance sign-off, and follow-up tasks.

This repository contains an offline-first meeting manager for Canadian Soft Water Corporation, Method HVAC Inc., and future partner workflows connected through the Methodz brand ecosystem.

> Methodz is treated in this app as a shared brand identity and operating ecosystem, not as a separate company.

## Current Version

**Version:** 0.3.0 workflow hardening build

The application is intentionally simple: static HTML, CSS, and vanilla JavaScript. It can run by opening `meeting.html` directly in a browser.

## Files

```text
methodz-meeting-manager/
├── meeting.html                 Main application page
├── style.css                    Responsive interface and print styles
├── app.js                       Offline app logic
├── config.js                    Organizations, agenda items, labels, and storage keys
├── features-v03.js              Validation, minutes, task filters, and structured decisions
├── PROJECT.md                   Product specification and build rules
├── README.md                    Setup and usage guide
└── .github/
    └── copilot-instructions.md  AI build rules for GitHub Copilot
```

## Features

- Offline-first meeting records
- Configurable organizations and agenda groups
- Meeting status tracking
- Organizations / Representatives Present checklist
- Attendance sign-on with typed digital signatures
- Agenda checklist grouped by category
- Discussion notes
- Free-form decisions field
- Structured Decision Log with confirmed-by, date, status, and notes
- Follow-up tasks using **Assigned To** instead of **Owner**
- Task priority, target date, and progress fields
- Task filtering by text, progress, and priority
- Meeting summary
- Record Readiness Review panel
- Auto-saved draft
- Saved meeting archive using browser `localStorage`
- Search saved meeting records
- Open / edit saved records
- Delete saved records with confirmation
- Meeting Minutes Preview
- Download current meeting as TXT
- Download current meeting as JSON
- Export current or saved meeting as polished HTML minutes
- Export all saved records as JSON
- Import saved records from JSON
- Print / save PDF through the browser print dialog
- Mobile-friendly layout

## How to Use

### Option 1: Open directly

1. Download or clone the repository.
2. Open `meeting.html` in Chrome, Edge, Firefox, or Safari.
3. Fill out the meeting information.
4. Use **Record Readiness Review** to check the record.
5. Click **Save Record**.

### Option 2: Use GitHub Pages later

This app is static, so it can be deployed to GitHub Pages, Vercel, Netlify, Render static sites, or any basic web host.

No build command is required.

## Local Storage Warning

Saved records live in the browser's local storage. That means:

- Records are stored on the specific device and browser used.
- Clearing browser data can delete records.
- Exporting all records as JSON is the backup strategy until cloud sync exists.

Recommended habit: after important meetings, click **Export All JSON** and save the file somewhere safe.

## Data Export

Single meeting records can be downloaded as:

- `.txt` for readable meeting notes
- `.json` for structured backups or future sync
- `.html` for polished meeting minutes that can be opened, printed, or shared

All records can be exported as one JSON file using **Export All JSON**.

## Data Import

Use **Choose Import JSON** to import either:

- an array of meeting records, or
- an exported object containing a `records` array

Existing records with the same `id` are updated. New records are added.

## Configuration

Edit `config.js` to change:

- app title and subtitle
- logo paths
- default organizations
- meeting statuses
- attendance types
- task priorities
- task statuses
- agenda categories and checklist items
- storage keys

Keep `config.js` plain and dependency-free so the app remains portable.

## Version 0.3 Notes

Version 0.3 adds a modular enhancement layer in `features-v03.js`. This keeps the original offline core stable while adding workflow polish:

- structured decisions
- readiness review checks
- task filtering
- meeting minutes preview
- polished HTML export

This is the preferred pattern until the app is ready for larger architecture changes.

## Development Rules

- Keep the base app offline-first.
- Keep it deployable as static files.
- Avoid frameworks until the core workflow is proven.
- Avoid the word **Owner** for task responsibility.
- Use **Assigned To**.
- Use **Organizations / Representatives Present**.
- Do not imply Methodz is a registered company.
- Keep records exportable before adding any cloud sync.

## Roadmap

### Version 0.4

- Editable agenda templates inside the app
- Organization presets
- Contact presets
- Meeting type templates
- Safer import preview before merge
- Better saved-record detail screen

### Version 0.5

- Attachment references
- Improved signature controls
- Meeting numbering settings
- Archive filters by organization and status
- Cloud-sync adapter stub

### Version 1.0

- Full meeting archive view
- Role-aware meeting records
- Attachment references
- Signature improvements
- Cloud-sync-ready data adapter

### Version 2.0

- Firebase or Supabase sync
- User accounts
- Permissions
- AI meeting summaries
- Calendar integration
- CRM integration
- Audio or video recording workflow

## Status

The app is now a working static prototype with real local saving, search, export, import, editing, structured decisions, task filtering, validation review, and HTML meeting minutes export. The next stage is template editing and safer import preview.
