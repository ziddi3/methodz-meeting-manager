# GitHub Copilot Instructions — Methodz Meeting Manager

## Project Identity

Methodz Meeting Manager is an offline-first meeting-record application for Canadian Soft Water Corporation, Method HVAC Inc., and future partner organizations.

Methodz is a shared brand identity and operating ecosystem, not a separate company. Never describe it as a company unless the repository owner explicitly changes that instruction.

## Deployment Contract

Maintain the application with:

- semantic HTML5
- CSS3
- vanilla JavaScript
- browser `localStorage`
- no runtime framework
- no required build command
- no required network connection

The core workflow must continue to run by opening `meeting.html` directly. Hosted PWA support is optional and may activate only on HTTPS or localhost.

CI-only testing dependencies are allowed when they do not enter the deployed application.

## Current Release Architecture

- `meeting.html`: main meeting workspace
- `archive.html`: complete-record detail and print surface
- `config.js`: editable defaults, storage keys, schema version, roles, policies, and consent statement
- `migrations.js`: ordered historical migration registry
- `migrations-v10.js`: v1.0 schema extension and validation rules
- `data-adapter.js`: synchronous meeting-record provider contract
- `async-data-adapter.js`: Promise-based future remote-provider contract
- `attachment-adapter.js`: attachment-reference provider contract
- `app.js`: stable core form and local record workflow
- `features-v03*` through `features-v10*`: additive enhancement layers
- `archive.js` and `archive-v10.js`: archive rendering and v1.0 governance detail
- `manifest.webmanifest` and `service-worker.js`: optional static app shell
- `tests/`: CI-only Playwright coverage

Preserve script order. Later feature layers intentionally wrap functions installed by earlier layers.

## Required Product Capabilities

Preserve:

- meeting information and status
- Organizations / Representatives Present
- attendance and meeting-specific typed signatures
- explicit electronic-signature consent
- signature verification metadata
- agenda, notes, decisions, tasks, and meeting summary
- Assigned To, priority, due date, and task status
- templates and custom agenda items
- attendee and organization directories
- attachment references and attachment index
- draft auto-save and restore
- active-record search and edit
- non-destructive Archive Vault
- dedicated archive page and print output
- revision history, comparison, and restore
- workspace backup, replacement restore, and merge recovery
- schema migration
- consolidated active/archive workspace
- record classifications and workflow policies
- synchronous, asynchronous, and attachment provider health checks
- release audit export
- keyboard navigation and accessibility support
- optional hosted offline app shell

## Terminology

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

## v1.0 Governance Rules

Local role and policy controls are workflow safeguards, not authentication.

- Never claim local role selection proves identity.
- A future remote provider must enforce authenticated permissions server-side.
- Preserve record-level `accessControl` metadata.
- Preserve classification, policy, allowed roles, protected fields, preparation, review, and policy-note fields.
- Do not bypass edit or export gates without an explicit replacement policy.
- Keep archive records non-destructive by default.

## Signature Rules

- A typed signature must not save without explicit recorded consent.
- Preserve consent statement version and timestamp.
- Do not infer consent for older signatures during migration.
- “Name Match” means text equality only and must never be described as identity proof.
- Never place signatures or consent records inside reusable attendee-directory presets.
- Declined signatures must not remain as accepted signed rows.

## Attachment Rules

- Meeting records store attachment metadata and references, not binary file payloads.
- Reject `data:` and base64 content in attachment locations.
- A future binary provider must return stable references and preserve exportable metadata.
- Do not cache meeting attachments or meeting records in the service worker.

## Migration and Recovery Rules

- Migration functions must be ordered, idempotent, and safe to run repeatedly.
- Preserve unknown fields during migration.
- Preserve active records, archive entries, revisions, drafts, and governance metadata.
- Preserve a valid recovery package before replacement restore or merge.
- Keep recovery checksums valid.
- Do not overwrite local safety metadata with imported migration, merge, or recovery metadata.
- Preserve the current version before restoring an older revision.

## Provider Rules

A synchronous meeting provider implements:

```text
listRecords()
getRecord(recordId)
replaceRecords(records)
upsertRecord(record)
deleteRecord(recordId)
healthCheck()
```

An asynchronous provider implements Promise-returning equivalents.

An attachment provider implements:

```text
listReferences(record)
getReference(record, referenceId)
upsertReference(record, reference)
deleteReference(record, referenceId)
validateReference(reference)
healthCheck()
```

Do not run destructive tests against active user storage. Use isolated storage keys or test providers.

## Accessibility and Design

- Every interactive control must be keyboard reachable.
- Dynamic fields require associated labels.
- Keep focus visibly identifiable.
- Use live announcements for meaningful state changes when helpers are available.
- Respect reduced-motion preferences.
- Maintain the professional dark-header, white-card, touch-friendly, mobile-responsive interface.
- Keep archive and print views readable.

## Validation Before Completion

- Run `node --check` on every changed JavaScript file.
- Confirm both HTML entry points load required assets in the intended order.
- Validate `manifest.webmanifest` when PWA metadata changes.
- Ensure the service-worker asset list includes new static modules and excludes record data.
- Extend Playwright coverage for changed user-visible workflows.
- Update README, changelog, architecture, security, and manual test documentation.
- Do not claim CI passed until GitHub reports a completed successful run.

## Safety Rules

Never:

- break direct-file compatibility
- remove features without a replacement path
- require internet access for the base app
- add runtime dependencies without explicit approval
- hardcode sensitive business data
- bypass archive, migration, revision, merge, consent, governance, or recovery protections
- describe workflow role controls as real authentication
- transmit meeting data without an explicitly configured provider

Every change should improve maintainability, recoverability, portability, privacy, or usability.
