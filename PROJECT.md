# Methodz Meeting Manager — Project Specification

## Purpose

Methodz Meeting Manager is an offline-first meeting management app for Canadian Soft Water Corporation, Method HVAC Inc., and future partner organizations connected through the Methodz brand ecosystem.

Methodz is a brand identity and operating ecosystem, not a separate company. The app must make that clear in wording and data labels.

The app should capture meetings, attendance, digital sign-off, agenda items, discussion notes, decisions, follow-up tasks, meeting summaries, saved records, print exports, and future sync-ready data.

## Product Goals

- Work offline first.
- Be usable on phones, tablets, and desktops.
- Store meeting records locally before cloud sync exists.
- Keep meeting information organized and auditable.
- Support CSW, Method HVAC, sole proprietors, guests, and future partner organizations.
- Prepare for Firebase, Supabase, CRM sync, AI summaries, audio/video recording, and calendar integration.

## Version 0.1 Scope

Version 0.1 must include:

- `meeting.html` main app page.
- `style.css` responsive styling.
- `app.js` offline app logic.
- Header logo placeholders using image paths.
- Meeting information fields.
- Organizations / representatives present.
- Attendance sign-on with typed digital signatures.
- Agenda checklist grouped by category.
- Discussion notes.
- Decisions made.
- Follow-up tasks with clear labels.
- Meeting summary.
- Save record to localStorage.
- View saved records.
- Delete saved records.
- Print / save PDF through browser print.
- Download meeting record as TXT.
- Clear form only after confirmation.

## Important Label Rules

Do not use the word "Owner" for tasks because it can confuse users into thinking company ownership. Use:

- Assigned To
- Responsible Person
- Person Handling This

Preferred label: **Assigned To**.

Use **Organizations / Representatives Present** instead of **Companies Present** because attendees may include sole proprietors, partners, guests, or non-company representatives.

Use **Methodz Brand Mark** instead of **Methodz Company Logo**.

## Brand Context

Canadian Soft Water Corporation and Method HVAC Inc. are separate business entities.

Methodz is the shared brand identity, operating ecosystem, design language, and future business platform layer. The app must avoid language implying Methodz is a registered company unless that changes in future business records.

## Default Organizations

- Canadian Soft Water Corporation
- Method HVAC Inc.
- Sole Proprietor / Partner
- Guest / Other

## Default Agenda Categories

### Operations

- Scheduling and advance notice
- Childcare support for last-minute jobs
- Compensation and workload review
- Travel, meals, and weekend policy
- Employee retention and workload sustainability

### Marketing & Branding

- Current marketing channels
- Method HVAC marketing inclusion
- Canadian Soft Water logo decision
- Old franchise logo removal
- New merchandise and branded materials
- Vehicle decals, uniforms, hats, business cards, and print materials
- Brand relationship between CSW, Method HVAC, and the Methodz brand identity
- Visual separation versus shared brand alignment

### Technology & Workflow

- CRM and workflow improvements
- Meeting records app proposal
- Customer communication process
- Installer scheduling workflow
- Records, signatures, and meeting archive process

## Data Model

Meeting records should use a JSON-friendly structure:

```json
{
  "id": "string",
  "meetingNumber": "string",
  "title": "string",
  "status": "Scheduled | In Progress | Completed",
  "date": "YYYY-MM-DD",
  "location": "string",
  "facilitator": "string",
  "organizations": ["string"],
  "attendees": [
    {
      "name": "string",
      "organizationRole": "string",
      "attendanceType": "In Person | Remote | Phone",
      "signature": "string",
      "signedAt": "ISO timestamp"
    }
  ],
  "agenda": [
    {
      "item": "string",
      "completed": true
    }
  ],
  "notes": "string",
  "decisions": "string",
  "tasks": [
    {
      "task": "string",
      "assignedTo": "string",
      "priority": "Low | Normal | High | Critical",
      "due": "YYYY-MM-DD",
      "status": "Pending | In Progress | Completed"
    }
  ],
  "summary": "string",
  "savedAt": "ISO timestamp"
}
```

## Architecture Standards

For the first build, plain HTML/CSS/JavaScript is preferred. Do not add frameworks unless specifically requested.

Keep the first version easy to open offline by loading `meeting.html` directly in a browser.

Future modular structure should move toward:

```text
meeting-manager/
├── meeting.html
├── style.css
├── app.js
├── assets/
│   └── logos/
│       ├── csw-logo.png
│       ├── method-hvac-logo.png
│       └── methodz-brand.png
├── css/
└── js/
```

## Coding Standards

- Use semantic HTML.
- Use clear labels.
- Keep JavaScript readable.
- Prefer simple functions.
- Avoid hardcoding values that should later become configurable.
- Keep app logic offline-first.
- Confirm before deleting records.
- Confirm before clearing current form.
- Do not break existing functionality.
- Do not remove features without replacing them.
- Do not mix confusing business terminology into the UI.

## Future Roadmap

### Version 0.2

- Better saved record viewer.
- Search records.
- Export all records as JSON.
- Import records from JSON.
- Better print stylesheet.
- More professional logo handling.

### Version 1.0

- Full meeting archive.
- Meeting number generation.
- Editable agenda categories.
- Structured decisions.
- Digital signature improvements.
- Attachment support.
- Better mobile interface.

### Version 2.0

- Firebase or Supabase live sync.
- User accounts.
- Role permissions.
- AI meeting summaries.
- Audio recording.
- Video meeting links.
- Calendar sync.
- CRM integration.

## Copilot Rules

When GitHub Copilot or another AI agent works on this repository, it must:

- Preserve offline functionality.
- Keep the UI simple and professional.
- Use Methodz as a brand identity, not a company.
- Avoid the word "Owner" for tasks.
- Use "Assigned To" for responsibility fields.
- Build incrementally.
- Explain changes in commit messages.
- Avoid unnecessary dependencies.
- Keep files easy for a beginner to inspect and manually edit.

## Build Priority

The first complete deliverable should be a working offline app with:

1. `meeting.html`
2. `style.css`
3. `app.js`
4. logo image path placeholders
5. localStorage save/load/delete
6. print/download controls

After that, improve architecture and polish.
