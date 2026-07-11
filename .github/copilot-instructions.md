# GitHub Copilot Instructions — Methodz Meeting Manager

You are assisting with the Methodz Meeting Manager repository.

## Project Identity

This is an offline-first meeting management app for Canadian Soft Water Corporation, Method HVAC Inc., and future partner organizations.

Methodz is a brand identity and business ecosystem, not a separate company. Do not describe it as a company unless the repository owner later changes that instruction.

## Current Build Target

Maintain a professional offline application using:

- HTML5
- CSS3
- Vanilla JavaScript
- browser `localStorage`

Do not add React, Vue, Svelte, Angular, Next.js, Vite, npm packages, build steps, or external runtime dependencies unless specifically requested.

The app must continue to run by opening `meeting.html` directly in a browser.

## Entry Points and Architecture

- `meeting.html` is the main workspace.
- `archive.html` is the dedicated complete-record and print surface.
- `config.js` owns editable defaults and storage keys.
- `data-adapter.js` owns the record-storage contract.
- `app.js` owns the stable meeting core.
- `features-v03*` through `features-v08*` are additive enhancement layers.
- `adapter-contract-tests.js` tests the local adapter through isolated temporary storage.

Preserve script order in `meeting.html`. Later feature layers intentionally wrap functions installed by earlier layers.

## Required Features

Preserve all existing capabilities, including:

- meeting information and status
- Organizations / Representatives Present
- attendance and meeting-specific typed signatures
- categorized agenda checklist
- notes, structured decisions, tasks, and summary
- Assigned To, priority, due date, and task status
- templates and custom agenda items
- attendee and organization directories
- attachment references and attachment index
- local draft auto-save
- saved-record search, filters, archive page, and exports
- revision history and revision restore
- non-destructive Archive Vault
- complete workspace backup and restore
- adapter health checks and isolated contract tests
- keyboard navigation and accessibility enhancements

## Terminology Rules

Use:

- Organizations / Representatives Present
- Meeting Facilitator
- Follow-Up Tasks
- Assigned To
- Methodz Brand Mark
- Canadian Soft Water Corporation
- Method HVAC Inc.

Avoid:

- Owner for task responsibility
- Methodz company
- Company logo for Methodz

## Data Safety Rules

- Default saved-record removal must remain non-destructive archiving.
- Permanent deletion belongs only in the Archive Vault and must require confirmation.
- Preserve the current state before restoring a historical revision.
- Preserve a pre-restore recovery package before replacing workspace storage.
- Never store typed signatures inside reusable directory presets.
- Attachment references store pointers and notes, not binary files.
- Preserve unknown and older record fields during schema upgrades.
- Do not transmit meeting data unless a future provider is explicitly configured.

## Adapter Rules

A record provider must implement:

```text
listRecords()
getRecord(recordId)
replaceRecords(records)
upsertRecord(record)
deleteRecord(recordId)
healthCheck()
```

`createExportEnvelope(extra)` is optional.

Do not run destructive contract tests against the active adapter. Use isolated temporary storage or a dedicated test provider.

## Accessibility Rules

- Every interactive control must be keyboard reachable.
- Dynamic form fields must have associated labels.
- Focus must remain visibly identifiable.
- New status-changing actions should use the live announcement helper when available.
- Respect reduced-motion preferences.
- Do not remove the skip link or keyboard shortcut guide without replacement.

## Design Rules

The interface should remain:

- professional
- mobile friendly
- clear
- low clutter
- easy to print
- easy to inspect and manually edit

Use the existing dark header, white cards, clear labels, touch-friendly controls, and responsive layout.

## Validation Rules

Before considering a change complete:

- run `node --check` on changed JavaScript
- confirm required static files remain present
- verify `meeting.html` loads any new CSS and JavaScript
- run the in-app adapter contract tests when adapter behavior changes
- update README, changelog, architecture notes, and manual tests when features change

The `.github/workflows/static-checks.yml` workflow performs dependency-free syntax and entry-point checks.

## Safety Rules

Never:

- break existing functionality
- remove features without a replacement path
- hardcode sensitive business data
- require internet access for the base app
- add dependencies without approval
- rename important entry-point files without approval
- bypass archive, revision, or workspace recovery protections

Every change should improve maintainability, recoverability, or usability.
