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

Do not add React, Vue, Svelte, Angular, Next.js, Vite, build steps, or external runtime dependencies unless specifically requested.

CI-only testing dependencies are permitted when they do not enter the deployed application. The app must continue to run by opening `meeting.html` directly in a browser.

## Entry Points and Architecture

- `meeting.html` is the main workspace.
- `archive.html` is the dedicated complete-record and print surface.
- `config.js` owns editable defaults, schema version, and storage keys.
- `migrations.js` owns ordered schema migration and must load before the adapter and app core.
- `data-adapter.js` owns the record-storage contract.
- `app.js` owns the stable meeting core.
- `features-v03*` through `features-v09*` are additive enhancement layers.
- `manifest.webmanifest` and `service-worker.js` provide an optional hosted PWA shell.
- `adapter-contract-tests.js` tests the local adapter through isolated temporary storage.
- `tests/browser-smoke.spec.js` contains CI-only browser smoke tests.

Preserve script order in `meeting.html`. Later feature layers intentionally wrap functions installed by earlier layers.

Direct-file mode is mandatory. Service-worker and installation features must remain optional and protocol-aware.

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
- revision history, comparison, and restore
- non-destructive Archive Vault
- archive search, filtering, selection, and bulk export
- complete workspace backup and replacement restore
- non-destructive workspace package merge
- ordered schema migration
- adapter health checks and isolated contract tests
- keyboard navigation and accessibility enhancements
- optional hosted PWA installation and offline app-shell caching

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
- Preserve a valid pre-restore or pre-merge recovery package before changing workspace storage.
- Keep recovery-package checksums valid. Do not modify a checksummed package after creation without recomputing its checksum.
- Never store typed signatures inside reusable directory presets.
- Attachment references store pointers and notes, not binary files.
- Preserve unknown and older record fields during schema upgrades.
- Migration functions must be ordered, idempotent, and safe to run repeatedly.
- Revision comparison and archive exports must remain read-only.
- Do not transmit meeting data unless a future provider is explicitly configured.
- The service worker may cache static application assets only, never meeting records.

## Workspace Merge Rules

Workspace replacement restore and workspace merge are different operations.

For merge mode:

- validate package type and checksum before preview
- create a recovery package before applying changes
- preserve local-only Methodz storage keys
- merge active records by record ID
- merge archived records by archive ID
- deduplicate revision snapshots
- never import the source package's migration-state, merge-log, or recovery-package metadata over local safety metadata
- record the completed merge strategy and source information

Supported conflict strategies are:

```text
Prefer the newest record
Keep local values
Keep both record versions
```

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
- verify `meeting.html` loads new CSS and JavaScript in the intended order
- verify `archive.html` remains compatible with current schema migration
- run the in-app adapter contract tests when adapter behavior changes
- run or extend Playwright smoke coverage when user-visible workflows change
- validate `manifest.webmanifest` as JSON when PWA metadata changes
- update README, changelog, architecture notes, and manual tests when features change

The `.github/workflows/static-checks.yml` workflow performs static validation and CI-only browser smoke tests.

## Safety Rules

Never:

- break existing functionality
- remove features without a replacement path
- hardcode sensitive business data
- require internet access for the base app
- add runtime dependencies without approval
- rename important entry-point files without approval
- bypass archive, revision, migration, merge, or workspace recovery protections
- make PWA installation a requirement for using the app

Every change should improve maintainability, recoverability, portability, or usability.
